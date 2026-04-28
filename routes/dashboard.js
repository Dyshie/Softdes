const express = require('express');
const { database } = require('../config/firebase');
const authMiddleware = require('../middleware/authentication');
const { requireRole } = require('../middleware/authorization');
const notificationService = require('../services/notificationService');

const router = express.Router();

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const toMillis = (value) => {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

const getLowStockThreshold = (product = {}) => {
    if (typeof product.lowStockThreshold !== 'undefined') {
        return toNumber(product.lowStockThreshold, 10);
    }

    if (typeof product.stock?.reorderLevel !== 'undefined') {
        return toNumber(product.stock.reorderLevel, 10);
    }

    return 10;
};

const getProductQuantity = (product = {}) => {
    if (typeof product.quantity !== 'undefined') {
        return toNumber(product.quantity, 0);
    }

    return toNumber(product.stock?.current, 0);
};

const resolveActorName = (actorId, userLookup, staffLookup) => {
    if (!actorId) {
        return 'System';
    }

    return userLookup[actorId] || staffLookup[actorId] || actorId;
};

const buildLookups = async () => {
    const [usersSnapshot, staffSnapshot] = await Promise.all([
        database.ref('users').once('value'),
        database.ref('staff').once('value')
    ]);

    const userLookup = {};
    usersSnapshot.forEach((child) => {
        const user = child.val() || {};
        const displayName = user.displayName || user.name || user.email || child.key;
        userLookup[child.key] = displayName;
    });

    const staffLookup = {};
    staffSnapshot.forEach((child) => {
        const staff = child.val() || {};
        const displayName = staff.name || staff.displayName || staff.email || child.key;

        if (staff.uid) {
            staffLookup[staff.uid] = displayName;
        }

        staffLookup[child.key] = displayName;
    });

    return { userLookup, staffLookup };
};

const buildActivityEntries = ({ snapshot, type, buildTitle, buildDescription }) => {
    const entries = [];

    snapshot.forEach((child) => {
        const record = child.val() || {};
        const createdAt = record.updatedAt || record.createdAt || null;

        if (!createdAt) {
            return;
        }

        const action = record.updatedAt && toMillis(record.updatedAt) > toMillis(record.createdAt)
            ? 'Updated'
            : 'Created';

        entries.push({
            id: `${type}-${child.key}`,
            type,
            title: buildTitle(action, child.key, record),
            description: buildDescription(action, record),
            actorId: record.updatedBy || record.createdBy || null,
            createdAt
        });
    });

    return entries;
};

// Get dashboard statistics
router.get('/stats', authMiddleware, requireRole('super_admin', 'admin', 'station_staff'), async (req, res) => {
    try {
        const completedStatuses = new Set(['delivered', 'completed']);

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
            if (completedStatuses.has(order.status)) {
                totalRevenue += Number(order.totalAmount || 0);
            }
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
            const quantity = getProductQuantity(product);
            const price = typeof product.price !== 'undefined'
                ? Number(product.price || 0)
                : Number(product.pricing?.sellingPrice || 0);

            totalProducts++;
            if (quantity <= getLowStockThreshold(product)) {
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

// Get admin diagnostics
router.get('/diagnostics', authMiddleware, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
        const smtpStatus = notificationService.getRuntimeStatus();
        const diagnostics = {
            environment: process.env.NODE_ENV || 'development',
            firebaseDatabaseConfigured: !!process.env.FIREBASE_DATABASE_URL,
            firebaseApiKeyConfigured: !!process.env.FIREBASE_API_KEY,
            smtp: smtpStatus,
            warnings: []
        };

        if (!diagnostics.firebaseDatabaseConfigured) {
            diagnostics.warnings.push('Firebase database URL is not configured.');
        }

        if (!diagnostics.firebaseApiKeyConfigured) {
            diagnostics.warnings.push('Firebase API key is not configured.');
        }

        if (!smtpStatus.smtpConfigured) {
            diagnostics.warnings.push('SMTP credentials are not configured. Email notifications will stay in development mode.');
        }

        if (smtpStatus.smtpAuthFailed) {
            diagnostics.warnings.push('SMTP authentication failed. Gmail app-password setup is required for live email delivery.');
        }

        res.status(200).json(diagnostics);
    } catch (error) {
        console.error('Error fetching diagnostics:', error);
        res.status(500).json({ error: 'Failed to fetch diagnostics' });
    }
});

// Get recent operational activity for admins
router.get('/activity', authMiddleware, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
        const [lookups, ordersSnapshot, inventorySnapshot, staffSnapshot] = await Promise.all([
            buildLookups(),
            database.ref('orders').once('value'),
            database.ref('inventory').once('value'),
            database.ref('staff').once('value')
        ]);

        const entries = [
            ...buildActivityEntries({
                snapshot: ordersSnapshot,
                type: 'order',
                buildTitle: (action, id) => `${action} order ${id.substring(0, 8)}`,
                buildDescription: (action, record) => `${record.customerName || 'Customer'} · ${record.status || 'pending'} · ₱${Number(record.totalAmount || 0).toFixed(2)}`
            }),
            ...buildActivityEntries({
                snapshot: inventorySnapshot,
                type: 'inventory',
                buildTitle: (action, id, record) => `${action} product ${record.name || id}`,
                buildDescription: (action, record) => {
                    const quantity = getProductQuantity(record);
                    return `${quantity} ${record.unit || 'unit'}${quantity === 1 ? '' : 's'} in stock`;
                }
            }),
            ...buildActivityEntries({
                snapshot: staffSnapshot,
                type: 'staff',
                buildTitle: (action, id, record) => `${action} staff ${record.name || id}`,
                buildDescription: (action, record) => `${record.role || record.position || 'staff'} · ${record.status || 'active'}`
            })
        ]
            .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt))
            .slice(0, 12)
            .map((entry) => ({
                ...entry,
                actorName: resolveActorName(entry.actorId, lookups.userLookup, lookups.staffLookup)
            }));

        res.status(200).json(entries);
    } catch (error) {
        console.error('Error fetching activity:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

module.exports = router;
