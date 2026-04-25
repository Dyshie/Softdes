# Database Rules Deployment Guide

## Firebase Realtime Database Security Rules

This project uses Firebase Realtime Database with comprehensive security rules defined in `database.rules.json`.

### Deploying Rules

#### Option 1: Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Realtime Database** > **Rules**
4. Copy the contents of `database.rules.json`
5. Click **Publish**

#### Option 2: Firebase CLI
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project (if not done)
firebase init

# Deploy rules
firebase deploy --only database
```

### Rules Overview

The security rules implement:

- **Role-Based Access Control (RBAC)**: Different permissions for super_admin, admin, station_staff, driver, and customer roles
- **Data Validation**: Ensures data structure integrity
- **User Isolation**: Users can only access their own data where appropriate
- **Audit Trail**: Write-only audit logs for admin review

### Key Security Features

1. **Users Collection**:
   - Users can read/write their own profile
   - Admins can manage all users
   - Role validation on write operations

2. **Orders Collection**:
   - Customers can read their own orders
   - Staff can manage all orders
   - Drivers can update assigned order status

3. **Inventory Collection**:
   - All authenticated users can read
   - Only staff can modify inventory

4. **Audit Logs**:
   - Read-only for admins
   - Write operations blocked (logs created server-side)

### Testing Rules

Create a test script to validate rules:

```javascript
// test-rules.js
const firebase = require('firebase-admin');

// Initialize with test credentials
// Test various read/write operations with different user roles
```

### Rule Validation Checklist

- [ ] Users can read/write their own profile
- [ ] Admins can manage all users
- [ ] Customers can only create orders for themselves
- [ ] Staff can read all orders
- [ ] Drivers can only update assigned deliveries
- [ ] Inventory is readable by all authenticated users
- [ ] Only staff can modify inventory
- [ ] Audit logs are read-only for admins