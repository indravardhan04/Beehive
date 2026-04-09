const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const driver = require('../db');
const authenticateToken = require('../middleware/auth');

// Helper to generate IDs
const generateId = (prefix) => `${prefix}-${crypto.randomBytes(4).toString('hex')}`;

// GET /api/threads - Fetch threads (feed)
router.get('/', async (req, res) => {
    const filter = req.query.filter || 'LATEST'; // 'LATEST' or 'POPULAR'
    
    if (!driver) return res.status(500).json({ message: "Database not configured yet." });

    const session = driver.session();
    try {
        let query = `
            MATCH (u:User)-[:CREATED]->(t:Thread)
            OPTIONAL MATCH (t)<-[:COMMENTED]-(c:Comment)
            OPTIONAL MATCH (t)<-[v:UPVOTED|DOWNVOTED]-()
            WITH t, u, COUNT(DISTINCT c) AS commentCount, SUM(CASE WHEN type(v) = 'UPVOTED' THEN 1 WHEN type(v) = 'DOWNVOTED' THEN -1 ELSE 0 END) AS voteCount
        `;

        if (filter === 'UNSOLVED') {
            query += ` WHERE commentCount = 0`;
        }

        query += `
            RETURN t.id AS id, t.title AS title, t.content AS content, t.tag AS tag, t.createdAt AS createdAt, u.beeId AS author, commentCount, voteCount
        `;

        if (filter === 'POPULAR') {
            query += ` ORDER BY voteCount DESC, t.createdAt DESC`;
        } else {
            query += ` ORDER BY t.createdAt DESC`;
        }

        const result = await session.run(query);

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
        console.error("Fetch threads error:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        await session.close();
    }
});

// POST /api/threads - Create a new thread
router.post('/', authenticateToken, async (req, res) => {
    const { title, content, tag } = req.body;
    const { username } = req.user;

    if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required." });
    }

    if (!driver) return res.status(500).json({ message: "Database not configured yet." });

    const session = driver.session();
    try {
        const threadId = generateId('T');
        const timestamp = new Date().toISOString();
        const threadTag = tag ? tag.toUpperCase() : 'GENERAL';

        const result = await session.run(
            `
            MATCH (u:User {username: $username})
            CREATE (t:Thread {id: $threadId, title: $title, content: $content, tag: $threadTag, createdAt: $timestamp})
            CREATE (u)-[:CREATED]->(t)
            RETURN t
            `,
            { username, threadId, title, content, threadTag, timestamp }
        );

        if (result.records.length === 0) {
            return res.status(404).json({ message: "User not found to match thread creation." });
        }

        res.status(201).json({ message: "Thread created successfully", id: threadId });
    } catch (error) {
        console.error("Create thread error:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        await session.close();
    }
});

// POST /api/threads/:id/vote - Upvote or Downvote
router.post('/:id/vote', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { voteType } = req.body; // 'UP' or 'DOWN'
    const { username } = req.user;

    if (voteType !== 'UP' && voteType !== 'DOWN') {
        return res.status(400).json({ message: "Invalid vote type." });
    }

    if (!driver) return res.status(500).json({ message: "Database not configured yet." });

    const session = driver.session();
    try {
        // First delete any existing vote from this user on this thread to allow changing votes
        await session.run(`
            MATCH (u:User {username: $username})-[v:UPVOTED|DOWNVOTED]->(t:Thread {id: $id})
            DELETE v
        `, { username, id });

        // Add the new vote
        const rel = voteType === 'UP' ? 'UPVOTED' : 'DOWNVOTED';
        const result = await session.run(`
            MATCH (u:User {username: $username}), (t:Thread {id: $id})
            CREATE (u)-[:${rel}]->(t)
            RETURN t
        `, { username, id });
        
        if (result.records.length === 0) {
           return res.status(404).json({ message: "Thread or user not found." });
        }

        res.status(200).json({ message: "Vote registered." });
    } catch (error) {
        console.error("Vote error:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        await session.close();
    }
});

// POST /api/threads/:id/save - Toggle Save Thread
router.post('/:id/save', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { username } = req.user;

    if (!driver) return res.status(500).json({ message: "Database not configured yet." });

    const session = driver.session();
    try {
        // Check if already saved
        const checkResult = await session.run(`
            MATCH (u:User {username: $username})-[s:SAVED]->(t:Thread {id: $id})
            RETURN s
        `, { username, id });

        if (checkResult.records.length > 0) {
            // Unsave
            await session.run(`
                MATCH (u:User {username: $username})-[s:SAVED]->(t:Thread {id: $id})
                DELETE s
            `, { username, id });
            return res.status(200).json({ message: "Thread unsaved." });
        } else {
            // Save
            const result = await session.run(`
                MATCH (u:User {username: $username}), (t:Thread {id: $id})
                MERGE (u)-[:SAVED]->(t)
                RETURN t
            `, { username, id });

            if (result.records.length === 0) {
                return res.status(404).json({ message: "Thread or user not found." });
            }
            return res.status(200).json({ message: "Thread saved." });
        }
    } catch (error) {
        console.error("Save error:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        await session.close();
    }
});

// DELETE /api/threads/:id - Delete a thread (owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { username } = req.user;

    if (!driver) return res.status(500).json({ message: "Database not configured yet." });

    const session = driver.session();
    try {
        // Verify ownership first
        const check = await session.run(`
            MATCH (u:User {username: $username})-[:CREATED]->(t:Thread {id: $id})
            RETURN t
        `, { username, id });

        if (check.records.length === 0) {
            return res.status(403).json({ message: "Unauthorized: You did not create this thread." });
        }

        // Cascade delete: thread + all comments + all votes + all saves
        await session.run(`
            MATCH (t:Thread {id: $id})
            OPTIONAL MATCH (t)<-[:COMMENTED]-(c:Comment)
            OPTIONAL MATCH (t)<-[v:UPVOTED|DOWNVOTED]-()
            OPTIONAL MATCH (t)<-[s:SAVED]-()
            OPTIONAL MATCH ()-[cr:CREATED]->(t)
            DETACH DELETE t, c
        `, { id });

        res.status(200).json({ message: "Thread deleted." });
    } catch (error) {
        console.error("Delete thread error:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        await session.close();
    }
});

module.exports = router;

