const neo4j = require('neo4j-driver');
require('dotenv').config();

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USERNAME;
const password = process.env.NEO4J_PASSWORD;

let driver = null;

if (!uri || !user || !password) {
    console.error("⚠️  Neo4j credentials missing! Set NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD in env vars.");
    console.error("   Current values — URI:", uri, "| USER:", user, "| PASS:", password ? "***set***" : "MISSING");
} else {
    try {
        driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
        console.log("✅ Neo4j driver created for:", uri);
    } catch (err) {
        console.error("❌ Failed to create Neo4j driver:", err.message);
    }
}

module.exports = driver;
