module.exports = {
  mongoose: {
    uri: "",
    server: { poolSize: 40 }
  },
  verbose: false,
  filename: "../example-osm/vaticano.osm",
  host: "localhost",
  port: "27017",
  database: "vaticanoDB",
  suppressErrors: false,
  useOriginalID: true,
  upsert: false,
  xmlns: true,
  strict: false,
  lowercase:true,
  singleCollection: false,
  timeBucket: false,
  logInterval: 15,
  node: {
    keepAttributes: ['_id', 'tags', 'loc'],
    ignoreAttributes:['version','uid','user','changeset','timestamp','visible'],
    mongooseVersionKey: false,
    storeUpdateTime: false
  },
  way: {
    keepAttributes: ['_id', 'tags', 'loc', 'nodes'],
    ignoreAttributes:['version','uid','user','changeset','timestamp','visible'],
    populateGeometry: false,
    nodeIdList: true,
    mongooseVersionKey: false,
    storeUpdateTime: false
  },
  relation: {
    populateGeometry: false,
    keepAttributes: ['_id', 'tags', 'loc', 'members'],
    ignoreAttributes:['version','uid','user','changeset','timestamp','visible'],
    mongooseVersionKey: false,
    storeUpdateTime: false
  }
};
