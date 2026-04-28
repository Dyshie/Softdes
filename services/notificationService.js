const nodemailer = require('nodemailer');
const { database } = require('../config/firebase');
const emailTemplates = require('../templates/emailTemplates');

const getSmtpPort = () => Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);

const getSmtpHost = () => process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';

const getSmtpUser = () => process.env.SMTP_USER || process.env.EMAIL_USER;

const getSmtpPass = () => process.env.SMTP_PASS || process.env.EMAIL_PASS;

// Email configuration
const emailConfig = {
    host: getSmtpHost(),
    port: getSmtpPort(),
    secure: typeof process.env.SMTP_SECURE !== 'undefined'
        ? process.env.SMTP_SECURE === 'true'
        : getSmtpPort() === 465,
    auth: {
        user: getSmtpUser(),
        pass: getSmtpPass()
    }
};

// Create email transporter
const transporter = nodemailer.createTransport(emailConfig);

class NotificationService {
    constructor() {
        this.templates = emailTemplates;
        this.smtpAuthFailed = false;
    }

    getRuntimeStatus() {
        const smtpConfigured = !!(getSmtpUser() && getSmtpPass());

        return {
            smtpConfigured,
            smtpHealthy: smtpConfigured && !this.smtpAuthFailed,
            smtpAuthFailed: this.smtpAuthFailed,
            host: getSmtpHost(),
            port: getSmtpPort(),
            from: process.env.SMTP_FROM || process.env.EMAIL_FROM || getSmtpUser() || null
        };
    }

    isEmailConfigured() {
        return !this.smtpAuthFailed && !!(getSmtpUser() && getSmtpPass());
    }

    // Send email notification
    async sendEmail(to, templateName, data) {
        try {
            if (this.smtpAuthFailed) {
                return false;
            }

            if (!this.isEmailConfigured()) {
                if (process.env.NODE_ENV === 'production') {
                    console.warn('SMTP credentials not configured, skipping email send');
                } else {
                    console.info('SMTP credentials not configured; using development email fallback');
                }
                return false;
            }

            const template = this.templates[templateName];
            if (!template) {
                throw new Error(`Template ${templateName} not found`);
            }

            let subject = template.subject;
            let html = template.html;

            // Simple template replacement
            Object.keys(data).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                subject = subject.replace(regex, data[key]);
                html = html.replace(regex, data[key]);
            });

            // Handle conditional blocks (simple implementation)
            html = html.replace(/{{#if notes}}([\s\S]*?){{\/if}}/g, data.notes ? '$1' : '');
            html = html.replace(/{{#each lowStockItems}}([\s\S]*?){{\/each}}/g, (match, content) => {
                if (!data.lowStockItems || !Array.isArray(data.lowStockItems)) return '';
                return data.lowStockItems.map(item => {
                    let itemHtml = content;
                    Object.keys(item).forEach(key => {
                        itemHtml = itemHtml.replace(new RegExp(`{{${key}}}`, 'g'), item[key]);
                    });
                    return itemHtml;
                }).join('');
            });

            const mailOptions = {
                from: process.env.SMTP_FROM || process.env.EMAIL_FROM || getSmtpUser(),
                to: to,
                subject: subject,
                html: html
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', info.messageId);
            return true;
        } catch (error) {
            if (error?.code === 'EAUTH' || error?.responseCode === 534) {
                this.smtpAuthFailed = true;
                console.warn('SMTP authentication failed. Gmail requires an app-specific password. Email delivery has been disabled for this process.');
                return false;
            }

            console.error('Error sending email:', error);
            return false;
        }
    }

    // Store notification in database
    async storeNotification(userId, notification) {
        try {
            const notificationData = {
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data || {},
                read: false,
                readAt: null,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
            };

            const newNotificationRef = database.ref(`notifications/${userId}`).push();
            await newNotificationRef.set(notificationData);

            return newNotificationRef.key;
        } catch (error) {
            console.error('Error storing notification:', error);
            throw error;
        }
    }

    // Send order confirmation notification
    async sendOrderConfirmation(orderData) {
        try {
            // Get customer email
            const customerSnapshot = await database.ref(`users/${orderData.customerId}`).once('value');
            const customer = customerSnapshot.val();

            if (!customer || !customer.email) {
                console.warn('Customer email not found for order confirmation');
                return;
            }

            // Send email
            await this.sendEmail(customer.email, 'orderConfirmation', {
                customerName: customer.displayName || customer.email,
                orderId: orderData.id,
                totalAmount: orderData.totalAmount,
                status: orderData.status
            });

            // Store in-app notification
            await this.storeNotification(orderData.customerId, {
                type: 'order',
                title: 'Order Confirmed',
                message: `Your order #${orderData.id} has been confirmed and is being processed.`,
                data: { orderId: orderData.id }
            });

        } catch (error) {
            console.error('Error sending order confirmation:', error);
        }
    }

    // Send order status update notification
    async sendOrderStatusUpdate(orderId, newStatus, notes = null) {
        try {
            // Get order data
            const orderSnapshot = await database.ref(`orders/${orderId}`).once('value');
            const order = orderSnapshot.val();

            if (!order) return;

            // Get customer email
            const customerSnapshot = await database.ref(`users/${order.customerId}`).once('value');
            const customer = customerSnapshot.val();

            if (!customer || !customer.email) {
                console.warn('Customer email not found for status update');
                return;
            }

            // Send email
            await this.sendEmail(customer.email, 'orderStatusUpdate', {
                customerName: customer.displayName || customer.email,
                orderId: orderId,
                status: newStatus,
                updatedAt: new Date().toLocaleString(),
                notes: notes
            });

            // Store in-app notification
            await this.storeNotification(order.customerId, {
                type: 'order',
                title: 'Order Status Updated',
                message: `Your order #${orderId} status has been updated to: ${newStatus}`,
                data: { orderId: orderId, status: newStatus }
            });

        } catch (error) {
            console.error('Error sending order status update:', error);
        }
    }

    // Send low stock alert to admins
    async sendLowStockAlert(lowStockItems) {
        try {
            // Get all admin users
            const usersSnapshot = await database.ref('users').once('value');
            const admins = [];

            usersSnapshot.forEach((child) => {
                const user = child.val();
                if (user.role === 'super_admin' || user.role === 'admin') {
                    admins.push({ uid: child.key, ...user });
                }
            });

            // Send email to each admin
            for (const admin of admins) {
                if (admin.email) {
                    await this.sendEmail(admin.email, 'lowStockAlert', {
                        lowStockItems: lowStockItems
                    });

                    // Store in-app notification
                    await this.storeNotification(admin.uid, {
                        type: 'inventory',
                        title: 'Low Stock Alert',
                        message: `${lowStockItems.length} product(s) are running low on stock.`,
                        data: { lowStockItems: lowStockItems }
                    });
                }
            }

        } catch (error) {
            console.error('Error sending low stock alert:', error);
        }
    }

    // Send delivery assignment notification
    async sendDeliveryAssignment(deliveryData) {
        try {
            // Get driver info
            const driverSnapshot = await database.ref(`users/${deliveryData.driverId}`).once('value');
            const driver = driverSnapshot.val();

            if (!driver || !driver.email) {
                console.warn('Driver email not found for delivery assignment');
                return;
            }

            // Get order data for customer info
            const orderSnapshot = await database.ref(`orders/${deliveryData.orderId}`).once('value');
            const order = orderSnapshot.val();

            if (!order) return;

            // Send email
            await this.sendEmail(driver.email, 'deliveryAssigned', {
                driverName: driver.displayName || driver.email,
                orderId: deliveryData.orderId,
                customerName: order.customerName,
                address: order.customerAddress,
                scheduledTime: order.scheduledFor ? new Date(order.scheduledFor).toLocaleString() : 'ASAP'
            });

            // Store in-app notification
            await this.storeNotification(deliveryData.driverId, {
                type: 'delivery',
                title: 'New Delivery Assigned',
                message: `You have been assigned delivery for order #${deliveryData.orderId}`,
                data: { orderId: deliveryData.orderId, deliveryId: deliveryData.id }
            });

        } catch (error) {
            console.error('Error sending delivery assignment:', error);
        }
    }
}

module.exports = new NotificationService();