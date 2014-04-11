/* jshint -W004 */

var fs = require("fs"),
    options = require('./options.js');

require('./commandline.js')(options);
require('./../node_modules/date-utils');

var mongoose = require("./schema/index.js")(options),
    queue = require("./queue.js")(options),
    saxStream = require("./../node_modules/sax").createStream(options.strict, options);

var Node = mongoose.model('node');
var Way = mongoose.model('way');
var Relation = mongoose.model('relation');
var entry;
var eof = false;
var idType;
var saveVar;
var inputArray = {};
// Accounting

var readNodes = 0;
var readWays = 0;
var readRelations = 0;
var lastReadNodes = 0;
var lastReadWays = 0;
var lastReadRelations = 0;
var lastSavedNodes = 0;
var lastSavedWays = 0;
var lastSavedRelations = 0;

var entrySaved = 0;

// TODO: break logging, timing and finalEntry in to seperate logging file.
function log() {
  var time = options.logInterval;
  console.log("Nodes: "+inputArray["node"]);
  console.log("Ways: "+(inputArray["way"] ? inputArray["way"] : 0));
  console.log("Relations: "+(inputArray["relation"]  ? inputArray["relation"] : 0));
}

// TODO: evented call back from queue.js;
var startTime = new Date();
function timing() {
  var endTime = new Date();

  var hours = startTime.getHoursBetween(endTime);
  var minutes = startTime.getMinutesBetween(endTime) - (hours * 60);
  var seconds = startTime.getSecondsBetween(endTime) - (minutes * 60);

  process.stdout.write("Total Time: ");
  process.stdout.write(hours + " H ");
  process.stdout.write(minutes + "M ");
  process.stdout.write(seconds + "S");
  process.stdout.write("\n");
}

// TODO: evented call back from queue.js with a context of final node type.
//
function isFinalEntry () {
  log();
}

var intervalID;
mongoose.connection.on('open', function () {

  console.log("Starting to process the nodes");
  console.log("Logging Legend: Successful Save / Queue Called / Read From Stream");

  intervalID = setInterval(log, options.logInterval * 1000);

  saxStream.on("opentag", parse);
  saxStream.on("closetag", closetag);

  if (options.filename) {
    fs.createReadStream(options.filename)
      .pipe(saxStream);
  } else {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.pipe(saxStream);
  }

  saxStream.on("end", function() {
    eof = true;
    timing();
  });

  saxStream.on("error", function (e) {
    console.error("error!", e);
    this._parser.error = null;
    this._parser.resume();
  });
});

function parse (xmlNode)  {
  switch(xmlNode.name)
  {
    case "node":
      readNodes++;
      entry = new Node();
      var lat = parseFloat( xmlNode.attributes.lat.value );
      var lng = parseFloat( xmlNode.attributes.lon.value );
      entry.set("loc.coordinates", [lng,lat]);
      prepBaseNode(xmlNode);
      break;

    case "tag":
      var key   = "tags." + xmlNode.attributes.k.value.replace(/:/, "."),
          value = xmlNode.attributes.v.value;
      entry.set(key, value);
      break;

    case "nd":
      entry.nodes.push(parseInt(xmlNode.attributes.ref.value, 10));
      break;

    case "way":
      readWays++;
      entry = new Way();
      prepBaseNode(xmlNode);
      break;

    case "member":
      var member = {};
      for (var attribute in xmlNode.attributes) {
        var elm = xmlNode.attributes[attribute];
        if (attribute === "ref") elm.value = parseInt(elm.value, 10);
        member[attribute] = elm.value;
      }
      entry.members.push(member);
      break;

    case "relation":
      readRelations++;
      entry = new Relation();
      entry.members = [];
      prepBaseNode(xmlNode);
      break;

    case "osm":
      var val = {};
      for (var attribute in xmlNode.attributes) {
        val[attribute] = xmlNode.attributes[attribute].value;
      }
      break;

    case "bounds":
      var val = {};
      for (var attribute in xmlNode.attributes) {
        val[attribute] = xmlNode.attributes[attribute].value;
      }
      break;

    default:
      console.log(xmlNode);
      break;
  }
}

function closetag (tagName) {
  switch(tagName)
  {
    case "node":
      processNode(entry,function(){});
      break;

    case "way":
      processWay(entry,function(){});
      break;

    case "relation":
      processRelation(entry,function(){});
      break;
  }
}

function prepBaseNode (xmlNode) {

  entry.set("osm_id",  xmlNode.attributes.id.value);
  entry.set("type",  xmlNode.name);
  for (var attribute in xmlNode.attributes) {
    if (attribute === "id" || attribute === "lat" || attribute === "lon") continue;
    entry.set(attribute, xmlNode.attributes[attribute].value);
  }
}

//funzioni importate da queue

  if (!!options.useOriginalID) {
    idType = "_id";
  } else {
    idType = "osm_id";
  }

  if (!!options.upsert) {
    saveVar = upsert;
  } else {
    saveVar = save;
  }

  var relationFunction;
  if (!!options.relation.populateGeometry) {
    options.way.populateGeometry = true;
    relationFunction = populateRelation;
  } else {
    relationFunction = standardRelation;
  }

  var wayFunction;
  if (!!options.way.populateGeometry) {
    wayFunction = populateWayGeo;
  } else {
    wayFunction = standardWay;
  }

  // private functions
  function saveCB (err, doc) {
    if (!!err) return console.log(err);

    entrySaved++;

    var type = doc.constructor.modelName;
    inputArray[type] = inputArray[type]+1 || 1;

   }

  function upsert () {
    var Model = this.model(this.constructor.modelName),
        value = this.toObject(),
        query = {};
    query[idType] = value.osm_id;
    delete value._id;
    Model.findOneAndUpdate(query, value, {upsert: true}, saveCB);
  }

  function save() {
    this.save(saveCB);
  }

  function populateWayGeo (way, cb) {
    var Node = way.constructor.base.models.node;
    var query = {};
    query[idType] = {$in: way.nodes};
    var select = {"loc.coordinates": true};
    select[idType] = true;

    Node.find(query, select, populateWay);

    function populateWay (err, doc) {
      if (err) return console.log(err, way);

      var i = way.nodes.length;
      var coords = [];

      for (i;i--;) {// array to match to
        var b = doc.length;
        var nodeID = way.nodes[i];
        for (b;b--;) {// array being matched
          if (doc[b] && doc[b][idType] === nodeID) {
            coords.unshift(doc[b].loc.coordinates);
            continue;
          }
        }
      }

      way.set('loc.coordinates', coords);
      var isCircularId = way.nodes[0] === way.nodes[way.nodes.length-1];
      var isCircularLtLng = coords[0] === coords[coords.length-1];

      if (isCircularId || isCircularLtLng ) {
        way.set('loc.type', 'Polygon');
        way.loc.coordinates = [way.loc.coordinates];
      } else {
        way.set('loc.type', 'LineString');
      }

      saveVar.call(way);
      cb();
    }
  }

  function populateRelation (relation, cb) {
    var members = relation.members;
    var index = members.length;
    var typeList = {};

    for (index;--index;) {
      var type = members[index].type;
      var ref = members[index].ref;
      typeList[type] = typeList[type] || [];
      typeList[type].push(ref);
    };

    if (!!typeList.way && !!typeList.relation) return cb();
    var Way = relation.constructor.base.models.way;
    Way.find({osm_id: {$in:typeList.way}})
    .exec(function (err, doc) {
      if (!!err || !!!doc) return console.log(err);
      var i = members.length;
      for (i;--i;) {
        var d = doc.length;
        var type = members[index].type;
        var ref = members[index].ref;
        for (d;d--;) {
          if (members[i].ref !== doc[d].osm_id) continue;
          members[i].coordinates = doc[d].loc.coordinates;
        }
        if (!!options.verbose && !!members[i].coordinates)
          console.log(members[i].ref + ":no matching " + Model.modelName)
      };
      saveVar.call(relation);
    });
    cb();
  }

  function standardWay (way, cb) {
    var isCircularId = way.nodes[0] === way.nodes[way.nodes.length-1];
    if (isCircularId) {
      console.log("via circolare");
      way.set( 'loc.type', 'Polygon');
    } else {
      way.set( 'loc.type', 'LineString');
    }
    saveVar.call(way);
    cb();
  }

  function standardRelation (relation,cb) {
    saveVar.call(relation);
    cb();
  }

  // public queues
  processNode = function (node, cb) {
    node.set("loc.type", "Point");
    saveVar.call(node);
    cb();
  };

  processWay = function (way, cb) {
    wayFunction(way,cb);
  };

  processRelation = function (relation, cb) {
    relationFunction(relation,cb);
  };


