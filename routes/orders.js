const express = require('express');
const { validationResult, body } = require('express-validator');
const { database } = require('../config/firebase');
const authMiddleware = require('../middleware/authentication');
const { requireRole } = require('../middleware/authorization');
const notificationService = require('../services/notificationService');
const { normalizeOrder } = require('../utils/orderNormalization');

const router = express.Router();

const getLowStockThreshold = (product = {}) => {
    if (typeof product.lowStockThreshold !== 'undefined') {
        return Number(product.lowStockThreshold);
    }

    if (typeof product.stock?.reorderLevel !== 'undefined') {
        return Number(product.stock.reorderLevel);
    }

    return 10;
};

// Get all orders
router.get('/', authMiddleware, requireRole('super_admin', 'admin', 'station_staff'), async (req, res) => {
    try {
        const snapshot = await database.ref('orders').once('value');
        const orders = [];

        snapshot.forEach((child) => {
            orders.push({
                id: child.key,
                ...normalizeOrder(child.val() || {})
            });
        });

        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get single order
router.get('/:id', authMiddleware, requireRole('super_admin', 'admin', 'station_staff'), async (req, res) => {
    try {
        const snapshot = await database.ref(`orders/${req.params.id}`).once('value');
        
        if (!snapshot.exists()) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.status(200).json({
            id: req.params.id,
            ...normalizeOrder(snapshot.val() || {})
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Create new order
router.post('/', authMiddleware, requireRole('super_admin', 'admin', 'station_staff'), [
    body('customerId').isString().notEmpty().withMessage('Customer ID is required'),
    body('customerName').isString().notEmpty().withMessage('Customer name is required'),
    body('customerPhone').isMobilePhone().withMessage('Valid phone number is required'),
    body('customerAddress').isString().notEmpty().withMessage('Customer address is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.productId').isString().notEmpty().withMessage('Product ID is required for each item'),
    body('items.*.productName').isString().notEmpty().withMessage('Product name is required for each item'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('items.*.unitPrice').optional().isFloat({ min: 0 }).withMessage('Unit price must be non-negative'),
    body('items.*.price').optional().isFloat({ min: 0 }).withMessage('Price must be non-negative'),
    body('items.*.total').optional().isFloat({ min: 0 }).withMessage('Item total must be non-negative'),
    body('totalAmount').optional().isFloat({ min: 0 }).withMessage('Total amount must be non-negative'),
    body('status').optional().isIn(['pending', 'confirmed', 'processing', 'ready', 'in_transit', 'delivered', 'cancelled']).withMessage('Invalid status'),
    body('scheduledFor').optional().isISO8601().withMessage('Scheduled date must be valid ISO 8601 format')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    try {
        const normalizedItems = items.map((item) => {
            const quantity = Number(item.quantity || 0);
            const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
            const total = Number(item.total ?? (quantity * unitPrice));

            if (!item.productId || quantity <= 0 || unitPrice < 0 || total < 0) {
                throw new Error('Each item must include a valid productId and quantity');
            }

            return {
                ...item,
                quantity,
                unitPrice,
                price: unitPrice,
                total: Number(total.toFixed(2))
            };
        });

        const productQuantities = normalizedItems.reduce((acc, item) => {
            acc[item.productId] = (acc[item.productId] || 0) + Number(item.quantity);
            return acc;
        }, {});

        const lowStockAlerts = [];

        for (const [productId, requiredQty] of Object.entries(productQuantities)) {
            const inventoryItemRef = database.ref(`inventory/${productId}`);
            const inventorySnapshot = await inventoryItemRef.once('value');

            if (!inventorySnapshot.exists()) {
                return res.status(400).json({ error: `Insufficient stock for product ${productId}` });
            }

            const currentProduct = inventorySnapshot.val() || {};
            const hasLegacyQuantity = typeof currentProduct.quantity !== 'undefined';
            const hasNestedQuantity = typeof currentProduct.stock?.current !== 'undefined';

            if (!hasLegacyQuantity && !hasNestedQuantity) {
                return res.status(400).json({ error: `Insufficient stock for product ${productId}` });
            }

            const currentQuantity = hasLegacyQuantity
                ? Number(currentProduct.quantity || 0)
                : Number(currentProduct.stock?.current || 0);

            const updatedQuantity = currentQuantity - requiredQty;

            if (updatedQuantity < 0) {
                return res.status(400).json({ error: `Insufficient stock for product ${productId}` });
            }

            const updatedProduct = {
                ...currentProduct,
                quantity: updatedQuantity,
                stock: {
                    ...(currentProduct.stock || {}),
                    current: updatedQuantity,
                    available: Math.max(updatedQuantity - Number(currentProduct.stock?.reserved || 0), 0)
                }
            };

            await inventoryItemRef.update({
                quantity: updatedProduct.quantity,
                stock: updatedProduct.stock
            });

            if (updatedQuantity <= getLowStockThreshold(currentProduct)) {
                lowStockAlerts.push({
                    productId,
                    name: updatedProduct.name || productId,
                    remaining: updatedQuantity
                });
            }
        }

        const computedTotalAmount = normalizedItems.reduce((sum, item) => sum + Number(item.total || 0), 0);

        let assignedDriver = req.body.assignedDriver || null;
        if (assignedDriver) {
            const staffSnapshot = await database.ref('staff').once('value');
            const { buildDriverAssignmentLookup, resolveAssignedDriverUid } = require('../utils/driverAssignment');
            assignedDriver = resolveAssignedDriverUid(assignedDriver, buildDriverAssignmentLookup(staffSnapshot));
        }

        const orderData = {
            ...req.body,
            items: normalizedItems,
            totalAmount: Number(req.body.totalAmount ?? computedTotalAmount),
            assignedDriver,
            createdBy: req.user.uid,
            createdAt: new Date().toISOString(),
            status: req.body.status || 'pending'
        };

        const newOrderRef = database.ref('orders').push();
        await newOrderRef.set(orderData);

        // Send order confirmation notification
        const orderWithId = { id: newOrderRef.key, ...orderData };
        notificationService.sendOrderConfirmation(orderWithId);

        // Send low stock alerts if any
        if (lowStockAlerts.length > 0) {
            notificationService.sendLowStockAlert(lowStockAlerts);
        }

        res.status(201).json({
            id: newOrderRef.key,
            ...orderData,
            lowStockAlerts
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Update order (full update allowed for super_admin, admin, and station_staff)
router.put('/:id', authMiddleware, requireRole('super_admin', 'admin', 'station_staff'), async (req, res) => {
    try {
        const orderRef = database.ref(`orders/${req.params.id}`);
        const [snapshot, staffSnapshot] = await Promise.all([
            orderRef.once('value'),
            database.ref('staff').once('value')
        ]);

        if (!snapshot.exists()) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const { buildDriverAssignmentLookup, resolveAssignedDriverUid } = require('../utils/driverAssignment');
        const driverLookup = buildDriverAssignmentLookup(staffSnapshot);

        const updatedData = {
            ...snapshot.val(),
            ...req.body,
            updatedAt: new Date().toISOString(),
            updatedBy: req.user.uid
        };

        if (typeof updatedData.assignedDriver !== 'undefined') {
            updatedData.assignedDriver = resolveAssignedDriverUid(updatedData.assignedDriver, driverLookup);
        }

        await orderRef.set(updatedData);

        res.status(200).json({
            id: req.params.id,
            ...updatedData
        });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// Update order status (drivers can update status only)
router.patch('/:id/status', authMiddleware, [
    body('status').isString().notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const orderRef = database.ref(`orders/${req.params.id}`);
        const [snapshot, staffSnapshot] = await Promise.all([
            orderRef.once('value'),
            database.ref('staff').once('value')
        ]);

        if (!snapshot.exists()) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const allowedStatuses = ['pending', 'processing', 'in_transit', 'delivered', 'cancelled'];
        const { status } = req.body;

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid order status' });
        }

        const currentOrder = snapshot.val();
        const { buildDriverAssignmentLookup, resolveAssignedDriverUid } = require('../utils/driverAssignment');
        const driverLookup = buildDriverAssignmentLookup(staffSnapshot);
        const assignedDriverUid = resolveAssignedDriverUid(currentOrder.assignedDriver || currentOrder.assignedDriverId, driverLookup);

        if (req.user.role === 'driver') {
            if (assignedDriverUid && assignedDriverUid !== req.user.uid) {
                return res.status(403).json({ error: 'You can only update deliveries assigned to you' });
            }

            await orderRef.update({
                status,
                updatedBy: req.user.uid,
                updatedAt: new Date().toISOString()
            });

            // Send status update notification
            notificationService.sendOrderStatusUpdate(req.params.id, status);

            return res.status(200).json({ message: 'Order status updated successfully' });
        }

        if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && req.user.role !== 'station_staff') {
            return res.status(403).json({ error: 'Insufficient permissions to change order status' });
        }

        const updateData = {
            status,
            updatedBy: req.user.uid,
            updatedAt: new Date().toISOString()
        };

        const assignedDriver = typeof req.body.assignedDriver !== 'undefined'
            ? resolveAssignedDriverUid(req.body.assignedDriver, driverLookup)
            : assignedDriverUid;

        if (typeof assignedDriver !== 'undefined') {
            updateData.assignedDriver = assignedDriver;
        }

        await orderRef.update(updateData);

        // Send status update notification
        notificationService.sendOrderStatusUpdate(req.params.id, status);

        res.status(200).json({ message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Delete order
router.delete('/:id', authMiddleware, requireRole('super_admin', 'admin', 'station_staff'), async (req, res) => {
    try {
        await database.ref(`orders/${req.params.id}`).remove();
        res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

module.exports = router;
