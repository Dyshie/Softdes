const { normalizeRole } = require('../utils/roleNormalization');

const requireRole = (...allowedRoles) => {
    const normalizedAllowedRoles = allowedRoles.map((role) => normalizeRole(role));

    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!normalizedAllowedRoles.includes(normalizeRole(req.user.role))) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};

module.exports = {
    requireRole
};
