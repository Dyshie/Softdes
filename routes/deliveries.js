const express = require('express');
const { database } = require('../config/firebase');
const authMiddleware = require('../middleware/authentication');
const { requireRole } = require('../middleware/authorization');
const { normalizeOrder } = require('../utils/orderNormalization');

const router = express.Router();

router.get('/', authMiddleware, requireRole('driver'), async (req, res) => {
    try {
        const snapshot = await database.ref('orders').once('value');
        const deliveries = [];

        snapshot.forEach((child) => {
            const order = normalizeOrder(child.val() || {});

            if (order.assignedDriver !== req.user.uid) {
                return;
            }

            if (order.status === 'delivered' || order.status === 'cancelled') {
                return;
            }

            deliveries.push({
                id: child.key,
                ...order
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