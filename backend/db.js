const neo4j = require('neo4j-driver');
require('dotenv').config();

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USERNAME;
const password = process.env.NEO4J_PASSWORD;

let driver;

if (!uri || !user || !password) {
    console.warn("Neo4j database credentials not set in .env! Database connection will fail.");
} else {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
}

module.exports = driver;
