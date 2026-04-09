const express = require('express');
const router = express.Router();
const driver = require('../db');
const authenticateToken = require('../middleware/auth');

// GET /api/profile - Fetch personal auth profile & stats
router.get('/', authenticateToken, async (req, res) => {
    const { username } = req.user;
    if (!driver) return res.status(500).json({ message: "Database not configured yet." });

    const session = driver.session();
    try {
        const query = `
            MATCH (u:User {username: $username})
            OPTIONAL MATCH (u)-[:CREATED]->(t:Thread)
            OPTIONAL MATCH (t)<-[v:UPVOTED]-()
            RETURN u.beeId AS beeId, 
                   count(DISTINCT t) AS totalThreads,
                   count(DISTINCT v) AS totalUpvotes
        `;
        const result = await session.run(query, { username });
        if (result.records.length === 0) return res.status(404).json({ message: "User not found" });

        const record = result.records[0];
        res.json({
            beeId: record.get('beeId'),
            totalThreads: record.get('totalThreads').toNumber(),
            totalUpvotes: record.get('totalUpvotes').toNumber()
        });
    } catch (error) {
        console.error("Profile error:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        await session.close();
    }
});

// GET /api/profile/:beeId/threads - Fetch public/private threads created by a specific user
router.get('/:beeId/threads', authenticateToken, async (req, res) => {
    const { beeId } = req.params;
    if (!driver) return res.status(500).json({ message: "Database not configured yet." });

    const session = driver.session();
    try {
        const query = `
            MATCH (u:User {beeId: $beeId})-[:CREATED]->(t:Thread)
            OPTIONAL MATCH (t)<-[:COMMENTED]-(c:Comment)
            OPTIONAL MATCH (t)<-[v:UPVOTED|DOWNVOTED]-()
            RETURN t.id AS id, t.title AS title, t.content AS content, t.tag AS tag, t.createdAt AS createdAt, u.beeId AS author,
                   COUNT(DISTINCT c) AS commentCount,
                   SUM(CASE WHEN type(v) = 'UPVOTED' THEN 1 WHEN type(v) = 'DOWNVOTED' THEN -1 ELSE 0 END) AS voteCount
            ORDER BY t.createdAt DESC
        `;
        const result = await session.run(query, { beeId });

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
        console.error("Profile threads error:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        await session.close();
    }
});

// GET /api/profile/saved - Fetch saved threads
router.get('/saved', authenticateToken, async (req, res) => {
    const { username } = req.user;
    if (!driver) return res.status(500).json({ message: "Database not configured yet." });

    const session = driver.session();
    try {
        const query = `
            MATCH (u:User {username: $username})-[:SAVED]->(t:Thread)
            OPTIONAL MATCH (t)<-[:CREATED]-(author:User)
            OPTIONAL MATCH (t)<-[:COMMENTED]-(c:Comment)
            OPTIONAL MATCH (t)<-[v:UPVOTED|DOWNVOTED]-()
            RETURN t.id AS id, t.title AS title, t.content AS content, t.tag AS tag, t.createdAt AS createdAt, author.beeId AS author,
                   COUNT(DISTINCT c) AS commentCount,
                   SUM(CASE WHEN type(v) = 'UPVOTED' THEN 1 WHEN type(v) = 'DOWNVOTED' THEN -1 ELSE 0 END) AS voteCount
            ORDER BY t.createdAt DESC
        `;
        const result = await session.run(query, { username });

        const threads = result.records.map(record => ({
            id: record.get('id'),
            title: record.get('title'),
            content: record.get('content'),
            tag: record.get('tag'),
            createdAt: record.get('createdAt'),
            author: record.get('author') || 'UNKNOWN',
            commentCount: record.get('commentCount').toNumber(),
            votes: record.get('voteCount').toNumber()
        }));

        res.json(threads);
    } catch (error) {
        console.error("Saved threads error:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        await session.close();
    }
});

// POST /api/profile/avatar - Update avatar
router.post('/avatar', authenticateToken, async (req, res) => {
    const { avatar } = req.body;
    const { username } = req.user;
    if (!avatar) return res.status(400).json({ message: "Avatar string required" });

    if (!driver) return res.status(500).json({ message: "Database not configured yet." });
    
    const session = driver.session();
    try {
        await session.run(`
            MATCH (u:User {username: $username})
            SET u.avatar = $avatar
            RETURN u
        `, { username, avatar });
        res.status(200).json({ message: "Avatar updated" });
    } catch (error) {
        console.error("Avatar error:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        await session.close();
    }
});

module.exports = router;
