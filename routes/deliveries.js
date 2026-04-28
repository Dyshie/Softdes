const express = require('express');
const { database } = require('../config/firebase');
const authMiddleware = require('../middleware/authentication');
const { requireRole } = require('../middleware/authorization');
const { normalizeOrder } = require('../utils/orderNormalization');
const { buildDriverAssignmentLookup, resolveAssignedDriverUid } = require('../utils/driverAssignment');

const router = express.Router();

router.get('/', authMiddleware, requireRole('driver'), async (req, res) => {
    try {
        const [snapshot, staffSnapshot] = await Promise.all([
            database.ref('orders').once('value'),
            database.ref('staff').once('value')
        ]);
        const driverLookup = buildDriverAssignmentLookup(staffSnapshot);
        const deliveries = [];

        snapshot.forEach((child) => {
            const order = normalizeOrder(child.val() || {});
            const assignedDriver = resolveAssignedDriverUid(order.assignedDriver || order.assignedDriverId, driverLookup);

            if (assignedDriver !== req.user.uid) {
                return;
            }

            if (order.status === 'delivered' || order.status === 'cancelled') {
                return;
            }

            deliveries.push({
                id: child.key,
                ...order,
                assignedDriver
            });
        });

        deliveries.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        res.status(200).json(deliveries);
    } catch (error) {
        console.error('Error fetching deliveries:', error);
        res.status(500).json({ error: 'Failed to fetch deliveries' });
    }
});

module.exports = router;