// Email Templates for Water Station Management System

const emailTemplates = {
    orderConfirmation: {
        subject: 'Order Confirmation - Water Station',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #007bff; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f9f9f9; }
                    .footer { background: #333; color: white; padding: 10px; text-align: center; font-size: 12px; }
                    .order-details { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Order Confirmation</h1>
                    </div>
                    <div class="content">
                        <p>Dear {{customerName}},</p>
                        <p>Thank you for your order! Your order has been successfully placed and is being processed.</p>

                        <div class="order-details">
                            <h3>Order Details</h3>
                            <p><strong>Order ID:</strong> {{orderId}}</p>
                            <p><strong>Total Amount:</strong> ₱{{totalAmount}}</p>
                            <p><strong>Status:</strong> {{status}}</p>
                        </div>

                        <p>You will receive updates on your order status. If you have any questions, please contact our support team.</p>

                        <p>Thank you for choosing our water station service!</p>
                    </div>
                    <div class="footer">
                        <p>Water Station Management System<br>
                        This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    },

    orderStatusUpdate: {
        subject: 'Order Status Update - Water Station',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #28a745; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f9f9f9; }
                    .footer { background: #333; color: white; padding: 10px; text-align: center; font-size: 12px; }
                    .status-update { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #28a745; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Order Status Update</h1>
                    </div>
                    <div class="content">
                        <p>Dear {{customerName}},</p>

                        <div class="status-update">
                            <h3>Status Update</h3>
                            <p><strong>Order ID:</strong> {{orderId}}</p>
                            <p><strong>New Status:</strong> {{status}}</p>
                            <p><strong>Updated At:</strong> {{updatedAt}}</p>
                            {{#if notes}}
                            <p><strong>Notes:</strong> {{notes}}</p>
                            {{/if}}
                        </div>

                        <p>Thank you for your patience. We'll keep you updated on any further changes.</p>
                    </div>
                    <div class="footer">
                        <p>Water Station Management System<br>
                        This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    },

    lowStockAlert: {
        subject: 'Low Stock Alert - Water Station',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f9f9f9; }
                    .footer { background: #333; color: white; padding: 10px; text-align: center; font-size: 12px; }
                    .alert-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                    .alert-table th, .alert-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                    .alert-table th { background: #f8f9fa; }
                    .low-stock { color: #dc3545; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Low Stock Alert</h1>
                    </div>
                    <div class="content">
                        <p>Dear Admin,</p>
                        <p>The following products are running low on stock and need immediate attention:</p>

                        <table class="alert-table">
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>Remaining Stock</th>
                                    <th>Unit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {{#each lowStockItems}}
                                <tr>
                                    <td>{{name}}</td>
                                    <td class="low-stock">{{remaining}}</td>
                                    <td>{{unit}}</td>
                                </tr>
                                {{/each}}
                            </tbody>
                        </table>

                        <p>Please restock these items as soon as possible to avoid service disruptions.</p>

                        <p>You can manage inventory through the admin dashboard.</p>
                    </div>
                    <div class="footer">
                        <p>Water Station Management System<br>
                        This is an automated alert, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    },

    deliveryAssigned: {
        subject: 'Delivery Assignment - Water Station',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #17a2b8; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f9f9f9; }
                    .footer { background: #333; color: white; padding: 10px; text-align: center; font-size: 12px; }
                    .delivery-info { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>New Delivery Assignment</h1>
                    </div>
                    <div class="content">
                        <p>Dear {{driverName}},</p>
                        <p>You have been assigned a new delivery. Please review the details below:</p>

                        <div class="delivery-info">
                            <h3>Delivery Details</h3>
                            <p><strong>Order ID:</strong> {{orderId}}</p>
                            <p><strong>Customer:</strong> {{customerName}}</p>
                            <p><strong>Delivery Address:</strong> {{address}}</p>
                            <p><strong>Scheduled Time:</strong> {{scheduledTime}}</p>
                        </div>

                        <p>Please confirm delivery completion through the mobile app once the order is delivered.</p>

                        <p>Safe driving!</p>
                    </div>
                    <div class="footer">
                        <p>Water Station Management System<br>
                        This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    },

    temporaryPassword: {
        subject: 'Your Temporary Password - Water Station',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #343a40; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f9f9f9; }
                    .footer { background: #333; color: white; padding: 10px; text-align: center; font-size: 12px; }
                    .password-box { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border: 1px dashed #6c757d; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to Water Station</h1>
                    </div>
                    <div class="content">
                        <p>Dear {{displayName}},</p>
                        <p>Your account has been created. Use the temporary password below to sign in for the first time.</p>
                        <p>You will also need the verification code below to confirm your account before changing your password.</p>

                        <div class="password-box">
                            <p><strong>Login Email:</strong> {{loginEmail}}</p>
                            <p><strong>Temporary Password:</strong> {{temporaryPassword}}</p>
                            <p><strong>Verification Code:</strong> {{verificationCode}}</p>
                            <p><strong>Verification Code Expires In:</strong> {{verificationExpiresMinutes}} minutes</p>
                            <p><strong>Role:</strong> {{role}}</p>
                        </div>

                        <p>Please change your password after you verify your account in the Profile page.</p>
                    </div>
                    <div class="footer">
                        <p>Water Station Management System<br>
                        This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    },

    verificationCode: {
        subject: 'Verification Code - Water Station',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f9f9f9; }
                    .footer { background: #333; color: white; padding: 10px; text-align: center; font-size: 12px; }
                    .code-box { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border: 1px dashed #6c757d; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Verify Your Account</h1>
                    </div>
                    <div class="content">
                        <p>Dear {{displayName}},</p>
                        <p>Use this verification code in your Profile page to confirm your account.</p>

                        <div class="code-box">
                            <p><strong>Login Email:</strong> {{loginEmail}}</p>
                            <p><strong>Verification Code:</strong> {{verificationCode}}</p>
                            <p><strong>Expires In:</strong> {{expiresMinutes}} minutes</p>
                        </div>

                        <p>If you did not request this code, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>Water Station Management System<br>
                        This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    },

    passwordReset: {
        subject: 'Password Reset Request - Water Station',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f9f9f9; }
                    .footer { background: #333; color: white; padding: 10px; text-align: center; font-size: 12px; }
                    .link-box { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border: 1px dashed #6c757d; word-break: break-all; }
                    .button { display: inline-block; background: #0ea5e9; color: white; text-decoration: none; padding: 12px 18px; border-radius: 6px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Reset Your Password</h1>
                    </div>
                    <div class="content">
                        <p>Dear {{displayName}},</p>
                        <p>We received a request to reset the password for your Water Station account ({{loginEmail}}).</p>

                        <div class="link-box">
                            <p><strong>Reset Link:</strong></p>
                            <p><a class="button" href="{{resetLink}}">Reset Password</a></p>
                            <p style="margin-top: 12px; font-size: 13px;">If the button does not work, copy and paste this link into your browser:</p>
                            <p>{{resetLink}}</p>
                        </div>

                        <p>If you did not request this reset, you can safely ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>Water Station Management System<br>
                        This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    }
};

module.exports = emailTemplates;