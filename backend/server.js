const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS — fully open for now to eliminate deployment issues ──
app.use(cors());
app.use(express.json());

// Health Check — works independently of database
app.get('/api/health', (req, res) => res.json({ status: 'UP', timestamp: new Date() }));

// ── Routes (lazy-loaded inside try/catch so a bad DB config doesn't crash the server) ──
try {
    const authRoutes = require('./routes/auth');
    const threadsRoutes = require('./routes/threads');
    const commentsRoutes = require('./routes/comments');
    const profileRoutes = require('./routes/profile');
    const trendingRoutes = require('./routes/trending');
    const searchRoutes = require('./routes/search');

    app.use('/api/auth', authRoutes);
    app.use('/api/threads', threadsRoutes);
    app.use('/api/threads', commentsRoutes);
    app.use('/api/profile', profileRoutes);
    app.use('/api/trending', trendingRoutes);
    app.use('/api/search', searchRoutes);
} catch (err) {
    console.error("Failed to load routes (check DB config):", err.message);
    // Server still starts so /api/health works for debugging
    app.use('/api', (req, res) => {
        res.status(500).json({ message: "Server misconfiguration. Check environment variables." });
    });
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
