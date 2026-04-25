const express = require('express');
const { validationResult, body } = require('express-validator');
const { database } = require('../config/firebase');
const authMiddleware = require('../middleware/authentication');
const { requireRole } = require('../middleware/authorization');

const router = express.Router();

// Get user's notifications
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.uid;
        const snapshot = await database.ref(`notifications/${userId}`).once('value');

        const notifications = [];
        snapshot.forEach((child) => {
            notifications.push({
                id: child.key,
                ...child.val()
            });
        });

        // Sort by creation date (newest first)
        notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Get unread notification count
router.get('/unread-count', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.uid;
        const snapshot = await database.ref(`notifications/${userId}`).once('value');

        let unreadCount = 0;
        snapshot.forEach((child) => {
            const notification = child.val();
            if (!notification.read) {
                unreadCount++;
            }
        });

        res.status(200).json({ count: unreadCount });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});

// Mark notification as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.uid;
        const notificationRef = database.ref(`notifications/${userId}/${req.params.id}`);

        const snapshot = await notificationRef.once('value');
        if (!snapshot.exists()) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await notificationRef.update({
            read: true,
            readAt: new Date().toISOString()
        });

        res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// Mark all notifications as read
router.patch('/mark-all-read', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.uid;
        const notificationsRef = database.ref(`notifications/${userId}`);

        const snapshot = await notificationsRef.once('value');
        const updates = {};

        snapshot.forEach((child) => {
            const notification = child.val();
            if (!notification.read) {
                updates[`${child.key}/read`] = true;
                updates[`${child.key}/readAt`] = new Date().toISOString();
            }
        });

        if (Object.keys(updates).length > 0) {
            await notificationsRef.update(updates);
        }

        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});

// Delete notification
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.uid;
        const notificationRef = database.ref(`notifications/${userId}/${req.params.id}`);

        const snapshot = await notificationRef.once('value');
        if (!snapshot.exists()) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await notificationRef.remove();
        res.status(200).json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

// Send test notification (admin only)
router.post('/test', authMiddleware, requireRole('super_admin'), [
    body('type').isIn(['order', 'delivery', 'payment', 'system', 'inventory']).withMessage('Invalid notification type'),
    body('title').isString().notEmpty().withMessage('Title is required'),
    body('message').isString().notEmpty().withMessage('Message is required'),
    body('targetUserId').optional().isString().withMessage('Target user ID must be a string')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { type, title, message, targetUserId } = req.body;
        const targetId = targetUserId || req.user.uid;

        // Verify target user exists
        const userSnapshot = await database.ref(`users/${targetId}`).once('value');
        if (!userSnapshot.exists()) {
            return res.status(404).json({ error: 'Target user not found' });
        }

        // Store notification
        const notificationRef = database.ref(`notifications/${targetId}`).push();
        await notificationRef.set({
            type: type,
            title: title,
            message: message,
            data: {},
            read: false,
            readAt: null,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

        res.status(201).json({
            message: 'Test notification sent',
            notificationId: notificationRef.key
        });
    } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({ error: 'Failed to send test notification' });
    }
});

// Get notification settings for user
router.get('/settings', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.uid;
        const settingsRef = database.ref(`userSettings/${userId}/notifications`);

        const snapshot = await settingsRef.once('value');
        const settings = snapshot.val() || {
            emailNotifications: true,
            pushNotifications: true,
            orderUpdates: true,
            deliveryUpdates: true,
            inventoryAlerts: false,
            systemNotifications: true
        };

        res.status(200).json(settings);
    } catch (error) {
        console.error('Error fetching notification settings:', error);
        res.status(500).json({ error: 'Failed to fetch notification settings' });
    }
});

// Update notification settings
router.put('/settings', authMiddleware, [
    body('emailNotifications').optional().isBoolean().withMessage('Email notifications must be boolean'),
    body('pushNotifications').optional().isBoolean().withMessage('Push notifications must be boolean'),
    body('orderUpdates').optional().isBoolean().withMessage('Order updates must be boolean'),
    body('deliveryUpdates').optional().isBoolean().withMessage('Delivery updates must be boolean'),
    body('inventoryAlerts').optional().isBoolean().withMessage('Inventory alerts must be boolean'),
    body('systemNotifications').optional().isBoolean().withMessage('System notifications must be boolean')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const userId = req.user.uid;
        const settingsRef = database.ref(`userSettings/${userId}/notifications`);

        await settingsRef.update(req.body);

        res.status(200).json({ message: 'Notification settings updated' });
    } catch (error) {
        console.error('Error updating notification settings:', error);
        res.status(500).json({ error: 'Failed to update notification settings' });
    }
});

module.exports = router;