const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const driver = require('../db');
const authenticateToken = require('../middleware/auth');

// Helper to generate a random bee ID (e.g., B-1234)
const generateBeeId = () => {
    return 'B-' + Math.floor(1000 + Math.random() * 9000);
};

router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
    }
    
    if (!driver) {
        return res.status(500).json({ message: "Database not configured yet." });
    }

    const session = driver.session();
    try {
        const checkResult = await session.run(
            'MATCH (u:User {username: $username}) RETURN u',
            { username }
        );

        if (checkResult.records.length > 0) {
            return res.status(400).json({ message: "Username already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const beeId = generateBeeId();

        await session.run(
            'CREATE (u:User {username: $username, password: $password, beeId: $beeId}) RETURN u',
            { username, password: hashedPassword, beeId }
        );

        res.status(201).json({ message: "Registered successfully", beeId });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        await session.close();
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
    }
    
    if (!driver) {
        return res.status(500).json({ message: "Database not configured yet." });
    }

    const session = driver.session();
    try {
        const result = await session.run(
            'MATCH (u:User {username: $username}) RETURN u',
            { username }
        );

        if (result.records.length === 0) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const user = result.records[0].get('u').properties;
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { username: user.username, beeId: user.beeId },
            process.env.JWT_SECRET || 'secret_key_123',
            { expiresIn: '24h' }
        );

        res.json({ token, message: "Logged in successfully", beeId: user.beeId, avatar: user.avatar });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        await session.close();
    }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const { username } = req.user;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: "All fields are required." });
    }

    if (!driver) return res.status(500).json({ message: "Database not configured yet." });

    const session = driver.session();
    try {
        const result = await session.run(
            'MATCH (u:User {username: $username}) RETURN u',
            { username }
        );

        if (result.records.length === 0) {
            return res.status(400).json({ message: "User not found" });
        }

        const user = result.records[0].get('u').properties;
        const validPassword = await bcrypt.compare(oldPassword, user.password);

        if (!validPassword) {
            return res.status(400).json({ message: "Old password is incorrect." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await session.run(
            'MATCH (u:User {username: $username}) SET u.password = $hashedPassword',
            { username, hashedPassword }
        );

        res.status(200).json({ message: "Password successfully updated." });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        await session.close();
    }
});

// GET /api/auth/count - Public endpoint: total registered bees
router.get('/count', async (req, res) => {
    if (!driver) return res.json({ count: 0 });
    const session = driver.session();
    try {
        const result = await session.run('MATCH (u:User) RETURN count(u) AS total');
        const total = result.records[0].get('total').toNumber();
        res.json({ count: total });
    } catch (e) {
        res.json({ count: 0 });
    } finally {
        await session.close();
    }
});

module.exports = router;
