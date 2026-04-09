const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const threadsRoutes = require('./routes/threads');
const commentsRoutes = require('./routes/comments');
const profileRoutes = require('./routes/profile');
const trendingRoutes = require('./routes/trending');
const searchRoutes = require('./routes/search');

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed origins — add your Netlify URL here when deploying
const allowedOrigins = [
    "http://localhost:5500",       // VS Code Live Server
    "http://localhost:3000",       // any local dev server
    "http://127.0.0.1:5500",
    "https://your-beehive.netlify.app",  // ← replace with your Netlify URL
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g. Postman, curl, mobile apps)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: Origin ${origin} not allowed`));
        }
    },
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/threads', threadsRoutes);
app.use('/api/threads', commentsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/trending', trendingRoutes);
app.use('/api/search', searchRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
