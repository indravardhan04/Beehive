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

// Allowed origins — add your Vercel/deployed URLs here
const allowedOrigins = [
    "http://localhost:5500",       // VS Code Live Server
    "http://localhost:3000",       // any local dev server
    "http://127.0.0.1:5500",
    "https://beehive-sage.vercel.app",  // Your Vercel frontend
    "https://your-beehive.netlify.app",  // If you use Netlify instead
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'UP', timestamp: new Date() }));

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
