module.exports = {
  mongoose: {
    uri: ""
  },
  verbose: false,
  filename: "example-osm/way.osm",
  host: "localhost",
  port: "27017",
  database: "test",
  suppressErrors: false,
  useOriginalID: false,
  upsert: false,
  xmlns: true,
  strict: false,
  lowercase:true,
  singleCollection: true,
  timeBucket: false,
  node: {
    ignoreAttributes: []
  },
  way: {
    ignoreAttributes: [],
    populateGeometry: true,
    nodeIdList: true
  },
  relation: {
    ignoreAttributes: []
  }
};
