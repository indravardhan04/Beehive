const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "No token provided, authorization denied." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_bee_token_123');
        req.user = decoded; // { username, beeId, iat, exp }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "SESSION_EXPIRED" });
        }
        res.status(403).json({ message: "Token is not valid." });
    }
};

module.exports = authenticateToken;
