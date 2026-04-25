const ROLE_ALIASES = {
    staff: 'station_staff'
};

const normalizeRole = (role, fallback = 'user') => {
    const resolvedRole = String(role || fallback).trim().toLowerCase();
    return ROLE_ALIASES[resolvedRole] || resolvedRole;
};

module.exports = {
    normalizeRole
};