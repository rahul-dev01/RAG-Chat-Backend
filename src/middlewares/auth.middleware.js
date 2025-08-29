const jwt = require('jsonwebtoken');
require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV;
const JWT_SECRET_KEY = process.env[`${NODE_ENV}_JWT_SECRET_KEY`];

const AuthMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Token missing' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET_KEY);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        req.userRole = decoded.role;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
    }
};

module.exports = {AuthMiddleware};
