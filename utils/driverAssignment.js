const buildDriverAssignmentLookup = (staffSnapshot) => {
    const lookup = new Map();

    if (!staffSnapshot) {
        return lookup;
    }

    staffSnapshot.forEach((child) => {
        const staff = child.val() || {};
        const uid = staff.uid || null;

        if (child.key) {
            lookup.set(child.key, uid || child.key);
        }

        if (uid) {
            lookup.set(uid, uid);
        }
    });

    return lookup;
};

const resolveAssignedDriverUid = (assignedDriver, lookup = new Map()) => {
    if (!assignedDriver) {
        return null;
    }

    return lookup.get(assignedDriver) || assignedDriver;
};

module.exports = {
    buildDriverAssignmentLookup,
    resolveAssignedDriverUid
};