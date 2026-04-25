const { auth } = require('../config/firebase');
const { normalizeRole } = require('../utils/roleNormalization');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Verify Firebase ID token
        const decodedToken = await auth.verifyIdToken(token);
        
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            role: normalizeRole(decodedToken.role)
        };
        
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = authMiddleware;
