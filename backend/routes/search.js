const express = require('express');
const router = express.Router();
const driver = require('../db');
const authenticateToken = require('../middleware/auth');

// GET /api/search?q=query
router.get('/', authenticateToken, async (req, res) => {
    const queryTerm = req.query.q;
    
    if (!queryTerm) return res.status(400).json({ message: "Search term required." });
    if (!driver) return res.status(500).json({ message: "Database not configured yet." });

    const session = driver.session();
    try {
        const query = `
            MATCH (u:User)-[:CREATED]->(t:Thread)
            WHERE t.title =~ '(?i).*' + $queryTerm + '.*' OR t.content =~ '(?i).*' + $queryTerm + '.*' OR t.tag =~ '(?i).*' + $queryTerm + '.*'
            OPTIONAL MATCH (t)<-[:COMMENTED]-(c:Comment)
            OPTIONAL MATCH (t)<-[v:UPVOTED|DOWNVOTED]-()
            RETURN t.id AS id, t.title AS title, t.content AS content, t.tag AS tag, t.createdAt AS createdAt, u.beeId AS author,
                   COUNT(DISTINCT c) AS commentCount,
                   SUM(CASE WHEN type(v) = 'UPVOTED' THEN 1 WHEN type(v) = 'DOWNVOTED' THEN -1 ELSE 0 END) AS voteCount
            ORDER BY t.createdAt DESC
        `;
        const result = await session.run(query, { queryTerm });

        const threads = result.records.map(record => ({
            id: record.get('id'),
            title: record.get('title'),
            content: record.get('content'),
            tag: record.get('tag'),
            createdAt: record.get('createdAt'),
            author: record.get('author'),
            commentCount: record.get('commentCount').toNumber(),
            votes: record.get('voteCount').toNumber()
        }));

        res.json(threads);
    } catch (error) {
        console.error("Search fetch error:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        await session.close();
    }
});

module.exports = router;
