# Notification System Setup Guide

## Overview
The Water Station Management System includes a comprehensive notification system that supports both email notifications and in-app notifications.

## Features
- ✅ Email notifications for order confirmations, status updates, and alerts
- ✅ In-app notifications stored in Firebase Realtime Database
- ✅ Notification settings per user
- ✅ Low stock alerts for administrators
- ✅ Delivery assignments for drivers
- ✅ Order status updates for customers

## Setup Instructions

### 1. Email Configuration
Add the following environment variables to your `.env` file:

```env
# SMTP Configuration for Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
```

#### Gmail Setup
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password: https://support.google.com/accounts/answer/185833
3. Use the App Password as `SMTP_PASS`

#### Other Email Providers
- **Outlook/Hotmail**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Update `SMTP_HOST` and `SMTP_PORT` accordingly

### 2. Firebase Database Rules
The notification system requires updated database rules. Deploy the updated `database.rules.json`:

```bash
firebase deploy --only database
```

### 3. Install Dependencies
```bash
npm install
```

## API Endpoints

### Notifications
- `GET /api/notifications` - Get user's notifications
- `GET /api/notifications/unread-count` - Get unread notification count
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/mark-all-read` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete notification
- `POST /api/notifications/test` - Send test notification (admin only)

### Notification Settings
- `GET /api/notifications/settings` - Get notification settings
- `PUT /api/notifications/settings` - Update notification settings

## Notification Types

### Email Notifications
1. **Order Confirmation** - Sent when order is placed
2. **Order Status Update** - Sent when order status changes
3. **Low Stock Alert** - Sent to admins when products run low
4. **Delivery Assignment** - Sent to drivers for new deliveries

### In-App Notifications
- Stored in `/notifications/{userId}/{notificationId}/`
- Include type, title, message, read status, and timestamps
- Automatically expire after 30 days

## Automatic Triggers

### Order Creation
- Sends order confirmation email to customer
- Creates in-app notification for customer
- Checks for low stock and alerts admins if needed

### Order Status Updates
- Sends status update email to customer
- Creates in-app notification for customer

### Inventory Management
- Monitors stock levels during order processing
- Sends low stock alerts to all administrators

## Customization

### Email Templates
Email templates are located in `templates/emailTemplates.js`. Each template includes:
- Subject line
- HTML content with placeholders
- Responsive design

### Notification Settings
Users can customize their notification preferences:
- Email notifications on/off
- Push notifications on/off
- Specific event types (orders, deliveries, inventory, system)

## Testing

### Test Email Configuration
```bash
# Send a test notification
curl -X POST http://localhost:5000/api/notifications/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "system",
    "title": "Test Notification",
    "message": "This is a test notification"
  }'
```

### Check Notification Settings
```bash
curl http://localhost:5000/api/notifications/settings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Email Not Sending
1. Check SMTP credentials in `.env`
2. Verify Gmail App Password (if using Gmail)
3. Check server logs for nodemailer errors
4. Test SMTP connection manually

### Notifications Not Appearing
1. Verify Firebase database rules are deployed
2. Check user authentication and permissions
3. Review server logs for database errors
4. Ensure notification data structure matches rules

### Template Issues
1. Check template syntax in `emailTemplates.js`
2. Verify placeholder replacement logic
3. Test HTML rendering in email client

## Security Considerations

- Email credentials are stored as environment variables
- User notification settings are user-controlled
- Database rules prevent unauthorized notification access
- Admin-only test notification endpoint

## Future Enhancements

- SMS notifications via Twilio
- Push notifications via FCM
- Notification templates in database
- Bulk notification sending
- Notification analytics