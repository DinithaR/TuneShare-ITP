import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Auth middleware: expects either raw token or `Bearer <token>` in Authorization header
export const protect = async (req, res, next) => {
    let token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ success: false, message: "Not authorized: missing token" });
    }
    // Support Bearer schema
    if (token.startsWith('Bearer ')) {
        token = token.slice(7).trim();
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({ success: false, message: "Not authorized: invalid token" });
        }
        const user = await User.findById(decoded).select('-password');
        if (!user) {
            return res.status(401).json({ success: false, message: "Not authorized: user not found" });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Not authorized: token verification failed" });
    }
};

export const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    next();
};


export const isOwner = (req, res, next) => {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Owner or Admin only' });
    }
    next();
};