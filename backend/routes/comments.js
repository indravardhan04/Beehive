const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const driver = require('../db');
const authenticateToken = require('../middleware/auth');

const generateId = (prefix) => `${prefix}-${crypto.randomBytes(4).toString('hex')}`;

// GET /api/threads/:id/comments - Fetch comments for a thread
router.get('/:id/comments', async (req, res) => {
    const { id } = req.params;
    
    if (!driver) return res.status(500).json({ message: "Database not configured yet." });

    const session = driver.session();
    try {
        const query = `
            MATCH (t:Thread {id: $id})<-[:REPLIED_TO]-(c:Comment)<-[:COMMENTED]-(u:User)
            RETURN c.id AS id, c.content AS content, c.createdAt AS createdAt, u.beeId AS author
            ORDER BY c.createdAt ASC
        `;
        const result = await session.run(query, { id });

        const comments = result.records.map(record => ({
            id: record.get('id'),
            content: record.get('content'),
            createdAt: record.get('createdAt'),
            author: record.get('author')
        }));

        res.json(comments);
    } catch (error) {
        console.error("Fetch comments error:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        await session.close();
    }
});

// POST /api/threads/:id/comments - Create a comment on a thread
router.post('/:id/comments', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    const { username } = req.user;

    if (!content) {
        return res.status(400).json({ message: "Content is required." });
    }

    if (!driver) return res.status(500).json({ message: "Database not configured yet." });

    const session = driver.session();
    try {
        const commentId = generateId('C');
        const timestamp = new Date().toISOString();

        const result = await session.run(
            `
            MATCH (u:User {username: $username}), (t:Thread {id: $id})
            CREATE (c:Comment {id: $commentId, content: $content, createdAt: $timestamp})
            CREATE (u)-[:COMMENTED]->(c)
            CREATE (c)-[:REPLIED_TO]->(t)
            RETURN c
            `,
            { username, id, commentId, content, timestamp }
        );

        if (result.records.length === 0) {
            return res.status(404).json({ message: "Thread or user not found." });
        }

        res.status(201).json({ message: "Comment added successfully", id: commentId });
    } catch (error) {
        console.error("Add comment error:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        await session.close();
    }
});

module.exports = router;
