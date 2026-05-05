// require('dotenv').config();

// const mongodb_host = process.env.MONGODB_HOST;
// const mongodb_user = process.env.MONGODB_USER;
// const mongodb_password = process.env.MONGODB_PASSWORD;

// const MongoClient = require("mongodb").MongoClient;
// const atlasURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/`;
// var database = new MongoClient(atlasURI, {});
// module.exports = {database};

// different way to connect to mongodb, using the connection string directly from env variable

// const { MongoClient } = require("mongodb");

// const uri = process.env.MONGODB_URI;

// const client = new MongoClient(uri);

// client.connect()
//     .then(() => console.log("Connected to MongoDB"))
//     .catch(err => console.error("MongoDB connection error:", err));

// module.exports = {
//     database: client
// };

const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri);

// connect immediately (safe pattern for school projects)
client.connect()
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection error:", err));

module.exports = client;
