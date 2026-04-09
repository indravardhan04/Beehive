const express = require('express');
const router = express.Router();
const driver = require('../db');
const authenticateToken = require('../middleware/auth');

// GET /api/trending - Fetch trending tags
router.get('/', authenticateToken, async (req, res) => {
    if (!driver) return res.status(500).json({ message: "Database not configured yet." });

    const session = driver.session();
    try {
        // Aggregate top used tags based on threads that have been created in the graph
        const query = `
            MATCH (t:Thread)
            WHERE t.tag IS NOT NULL
            RETURN t.tag AS tag, COUNT(t) AS count
            ORDER BY count DESC
            LIMIT 5
        `;
        const result = await session.run(query);

        const tags = result.records.map(record => ({
            tag: record.get('tag'),
            count: record.get('count').toNumber()
        }));

        res.json(tags);
    } catch (error) {
        console.error("Trending fetch error:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        await session.close();
    }
});

module.exports = router;
