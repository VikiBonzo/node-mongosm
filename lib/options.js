module.exports = {
  mongoose: {
    uri: "",
    server: { poolSize: 40 }
  },
  verbose: false,
  filename: "example-osm/way.osm",
  host: "localhost",
  port: "27017",
  database: "test",
  suppressErrors: false,
  useOriginalID: true,
  upsert: true,
  xmlns: true,
  strict: false,
  lowercase:true,
  singleCollection: false,
  timeBucket: false,
  logInterval: 15,
  node: {
    keepAttributes: ['_id', 'tags', 'loc'],
    mongooseVersionKey: false,
    storeUpdateTime: false
  },
  way: {
    keepAttributes: ['_id', 'tags', 'loc', 'nodes'],
    populateGeometry: false,
    nodeIdList: true,
    mongooseVersionKey: false,
    storeUpdateTime: false
  },
  relation: {
    populateGeometry: false,
    keepAttributes: ['_id', 'tags', 'loc', 'members'],
    mongooseVersionKey: false,
    storeUpdateTime: false
  }
};
