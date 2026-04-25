const express = require('express');
const { database } = require('../config/firebase');
const authMiddleware = require('../middleware/authentication');
const { requireRole } = require('../middleware/authorization');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authMiddleware, requireRole('super_admin', 'admin', 'station_staff'), async (req, res) => {
    try {
        // Fetch all data concurrently
        const [ordersSnapshot, staffSnapshot, inventorySnapshot] = await Promise.all([
            database.ref('orders').once('value'),
            database.ref('staff').once('value'),
            database.ref('inventory').once('value')
        ]);

        let totalOrders = 0;
        let totalRevenue = 0;
        let pendingOrders = 0;

        ordersSnapshot.forEach((child) => {
            const order = child.val();
            totalOrders++;
            totalRevenue += order.totalAmount || 0;
            if (order.status === 'pending') {
                pendingOrders++;
            }
        });

        let totalStaff = 0;
        let activeStaff = 0;

        staffSnapshot.forEach((child) => {
            const staff = child.val();
            totalStaff++;
            if (staff.status === 'active') {
                activeStaff++;
            }
        });

        let totalProducts = 0;
        let lowStockProducts = 0;
        let totalInventoryValue = 0;

        inventorySnapshot.forEach((child) => {
            const product = child.val();
            const quantity = typeof product.quantity !== 'undefined'
                ? Number(product.quantity || 0)
                : Number(product.stock?.current || 0);
            const price = typeof product.price !== 'undefined'
                ? Number(product.price || 0)
                : Number(product.pricing?.sellingPrice || 0);

            totalProducts++;
            if (quantity < 10) {
                lowStockProducts++;
            }
            totalInventoryValue += (price * quantity) || 0;
        });

        res.status(200).json({
            orders: {
                total: totalOrders,
                pending: pendingOrders,
                revenue: totalRevenue
            },
            staff: {
                total: totalStaff,
                active: activeStaff
            },
            inventory: {
                totalProducts,
                lowStock: lowStockProducts,
                totalValue: totalInventoryValue
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

// Get recent orders
router.get('/recent-orders', authMiddleware, requireRole('super_admin', 'admin', 'station_staff'), async (req, res) => {
    try {
        const snapshot = await database.ref('orders').once('value');
        const orders = [];

        snapshot.forEach((child) => {
            orders.push({
                id: child.key,
                ...child.val()
            });
        });

        // Sort by date and return last 5
        const recentOrders = orders
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        res.status(200).json(recentOrders);
    } catch (error) {
        console.error('Error fetching recent orders:', error);
        res.status(500).json({ error: 'Failed to fetch recent orders' });
    }
});

module.exports = router;
