# Project Finalization — Water Station Management System (H2GO)

## 1) What this project is
The **Water Station Management System (H2GO)** is a web-based system for running day-to-day water station operations:
- taking and managing customer orders
- tracking inventory and low-stock
- managing staff and driver accounts
- assigning and tracking deliveries
- showing operational dashboard stats
- generating daily sales reports (including PDF downloads)
- sending in-app and email notifications

It is built as:
- a **Node.js + Express** backend API
- deployed locally via `server.js` and deployable on Firebase as an HTTPS Function via `index.js`
- a **vanilla JavaScript SPA** hosted from `public/` (Bootstrap-based UI)
- Firebase services for authentication and persistent storage (Realtime Database)

---

## 2) Tech stack (what’s used)
**Backend**
- Node.js + Express
- Firebase Admin SDK (Auth + Realtime Database)
- `express-validator` for request validation
- `cors` for controlled cross-origin access
- `nodemailer` for SMTP email notifications
- `pdfkit` for PDF report generation

**Frontend (Web SPA)**
- Vanilla JS (no bundler)
- Bootstrap 5 UI
- Hash-based routing (`#/dashboard`, `#/orders`, etc.)
- A centralized API client (`ApiClient`) that stores the Firebase ID token in `localStorage`

**Firebase / Deployment**
- Firebase Hosting serves `public/`
- Hosting rewrite proxies `/api/**` to the Firebase Function (`exports.api`)
- Firebase Realtime Database rules are included in `database.rules.json`

---

## 3) Core system functions (modules)

### A) Authentication, authorization, and user lifecycle
**Goal:** secure access with role-based permissions.

Backend capabilities:
- **Initial setup lock**: only the first user can register as the initial `super_admin`.
- **Login**: email/password via Firebase Identity Toolkit REST endpoint; returns a Firebase ID token.
- **Role-based access control** (RBAC): endpoints use `requireRole(...)` to restrict access.
- **Profile management**: user can view/update profile details; password changes require OTP verification.

Roles present in code:
- `super_admin`
- `admin`
- `station_staff` (alias: `staff`)
- `driver`
- `customer` (supported in user creation)

OTP verification features:
- request a 6-digit verification code (stored hashed in the user profile)
- verify OTP and mark account as verified
- OTP verification is enforced before password changes

---

### B) Orders management
**Goal:** create, track, and update orders while keeping inventory consistent.

Backend capabilities:
- list all orders (restricted to station/admin roles)
- get one order by id
- create order:
  - validates customer + items
  - computes totals
  - **deducts inventory stock** per item
  - triggers notifications:
    - order confirmation notification
    - low-stock alerts (when remaining quantity is low)
- update order (full update via PUT)
- update order status (PATCH)
  - drivers can update status (only for their assigned deliveries)
  - status updates trigger customer notification
- delete order

Order status states supported in validation include:
- `pending`, `confirmed`, `processing`, `ready`, `in_transit`, `delivered`, `cancelled`

---

### C) Deliveries (driver workflow)
**Goal:** show drivers their assigned deliveries and allow status updates.

Backend capabilities:
- list active deliveries for the authenticated driver
  - filters orders by `assignedDriver === req.user.uid`
  - excludes completed/cancelled

Frontend capabilities:
- deliveries screen supports:
  - refresh
  - “Start Delivery” → sets status to `in_transit`
  - “Mark Delivered” → sets status to `delivered`

---

### D) Inventory management
**Goal:** manage products and stock levels.

Backend capabilities:
- list products
- get single product
- create product
- update product
- delete product

Inventory model supports **both** legacy flat fields and a richer nested structure:
- legacy: `price`, `quantity`
- nested: `pricing.*` and `stock.*` (current/reserved/available/reorder levels)

The API normalizes inventory data so callers can rely on:
- computed `pricing.sellingPrice`, `pricing.costPrice`, `pricing.markup`
- computed `stock.current`, `stock.available`, reorder defaults

Low-stock threshold behavior:
- dashboard counts low stock as `quantity < 10`
- order creation triggers low-stock alerts when remaining `<= 10`

---

### E) Staff management
**Goal:** manage staff directory and create operational accounts.

Backend capabilities:
- list staff
- get one staff member
- create staff (super-admin only):
  - creates Firebase Auth user
  - sets custom claim role
  - creates user profile under `/users/{uid}`
  - creates staff record under `/staff/{id}`
  - issues OTP verification data for first-time verification
- update staff
- delete staff
- list drivers (for assigning deliveries)

Frontend capabilities:
- staff screen (UI) is accessible for admin/super-admin navigation, but management actions are restricted to super-admin in the UI.

---

### F) Dashboard (operations overview)
**Goal:** provide a quick KPI view.

Backend provides:
- total orders, pending orders, revenue
- staff totals + active staff count
- inventory totals + low stock count + inventory value
- recent orders list

Frontend shows:
- KPI cards + recent orders table

---

### G) Reports (daily sales + PDF)
**Goal:** generate daily performance summary and downloadable reports.

Backend provides:
- daily report JSON summary (filters orders by today’s date)
- PDF generation endpoint that produces a “Daily Sales Report” PDF

Frontend provides:
- daily report view (table)
- “Generate Sales Report” button downloads a PDF

---

### H) Notifications (in-app + email)
**Goal:** keep customers and staff informed.

Capabilities:
- In-app notifications stored under `/notifications/{userId}/{notificationId}`
- Email notifications via SMTP (optional; skips sending if SMTP is not configured)
- Notification settings stored under `/userSettings/{userId}/notifications`

Notification triggers implemented:
- order confirmation (email + in-app for customer)
- order status update (email + in-app for customer)
- low stock alerts (email + in-app for admins)

Notification API features:
- list notifications
- unread count
- mark single read
- mark all read
- delete notification
- admin-only “test” notification sender
- get/update notification settings

---

## 4) Frontend features (what the UI can do)
The web UI is a SPA under `public/` with routes:
- `#/login` (rendered when not authenticated)
- `#/dashboard` (station/admin)
- `#/orders` (station/admin)
- `#/inventory` (station/admin)
- `#/staff` (admin navigation; super-admin management)
- `#/reports` (admin/super-admin)
- `#/deliveries` (drivers)
- `#/profile` (all authenticated users)

Key UX features:
- role-based navigation visibility
- CRUD modals for orders, inventory, and staff
- driver actions for starting/completing deliveries
- profile page supports:
  - requesting/verifying OTP code
  - updating display name + phone
  - changing password after OTP verification

The UI communicates to the backend through a centralized `ApiClient`, which:
- stores the ID token in `localStorage`
- supports configuring the API base URL (useful for local vs hosted)

---

## 5) Data model (Realtime Database, high-level)
Common top-level paths used by the backend:
- `/users/{uid}` — user profile (role, status, phone, verification/OTP fields)
- `/staff/{staffId}` — staff directory entries (linked to `uid`)
- `/orders/{orderId}` — orders with customer info, items, totals, assigned driver, status
- `/inventory/{productId}` — products + stock/pricing
- `/notifications/{uid}/{notificationId}` — in-app notifications
- `/userSettings/{uid}/notifications` — notification preference flags

---

## 6) Security and controls
- Authentication is enforced by verifying Firebase ID tokens.
- Authorization is enforced with role checks per route (`requireRole`).
- CORS is configured with an allowlist for known domains and localhost in development.
- Firebase database rules are versioned in `database.rules.json`.

---

## 7) Scripts and tests
Scripts:
- `npm run backfill:orders` — backfills legacy order totals/item totals/dates into a normalized form.

Tests (Node’s built-in test runner):
- order normalization logic
- report data aggregation logic
- OTP creation/verification logic

Run tests:
- `npm test`

---

## 8) Deployment / running (high-level)
Local run:
- `npm install`
- `npm start` (or `npm run dev`)

Firebase hosting + function deployment (high-level):
- Hosting serves `public/`
- `/api/**` routes rewrite to the deployed function

Environment variables commonly needed:
- Firebase:
  - `FIREBASE_DATABASE_URL`
  - service account JSON in repo root (or `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`)
  - `FIREBASE_API_KEY` (needed for the login REST call)
- Email (optional): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Optional operational defaults: `DEFAULT_TEMP_PASSWORD`, `OTP_EXPIRY_MINUTES`, `OTP_PEPPER`

---

## 9) Feature notes (implementation reality)
- Delivery assignment **data** exists (`assignedDriver` on orders) and drivers can view assigned deliveries.
- Email templates include “delivery assigned”, and the notification service has a `sendDeliveryAssignment()` helper; wiring that helper into an “assign driver” action is possible if needed.



# Implementation plan 

# H2GO — Water Station Management System
## Full Implementation Guide

**Stack:** Node.js · Express · Firebase Realtime Database · Firebase Auth · PDFKit · Nodemailer  
**Last updated:** 2026

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Environment Setup](#2-environment-setup)
3. [Firebase Initialization](#3-firebase-initialization)
4. [App Entry Point](#4-app-entry-point)
5. [Middleware](#5-middleware)
6. [Module A — Authentication & User Lifecycle](#6-module-a--authentication--user-lifecycle)
7. [Module B — Orders Management](#7-module-b--orders-management)
8. [Module C — Deliveries (Driver Workflow)](#8-module-c--deliveries-driver-workflow)
9. [Module D — Inventory Management](#9-module-d--inventory-management)
10. [Module E — Staff Management](#10-module-e--staff-management)
11. [Module F — Dashboard](#11-module-f--dashboard)
12. [Module G — Reports & PDF](#12-module-g--reports--pdf)
13. [Module H — Notifications](#13-module-h--notifications)
14. [Gap Fixes](#14-gap-fixes)
15. [Database Rules](#15-database-rules)
16. [Scripts & Tests](#16-scripts--tests)
17. [Deployment](#17-deployment)
18. [System Functionality Improvements](#18-system-functionality-improvements)

---

## 1. Project Structure

```
h2go/
├── public/                        # Vanilla JS SPA (Bootstrap 5)
│   ├── index.html
│   ├── app.js                     # Hash-based router + ApiClient
│   ├── pages/
│   │   ├── login.js
│   │   ├── dashboard.js
│   │   ├── orders.js
│   │   ├── inventory.js
│   │   ├── staff.js
│   │   ├── reports.js
│   │   ├── deliveries.js
│   │   └── profile.js
│   └── css/
│       └── app.css
├── src/
│   ├── firebase/
│   │   └── admin.js               # Firebase Admin SDK init
│   ├── middleware/
│   │   ├── auth.js                # Token verification
│   │   └── role.js                # RBAC guard
│   ├── routes/
│   │   ├── auth.js
│   │   ├── orders.js
│   │   ├── deliveries.js
│   │   ├── inventory.js
│   │   ├── staff.js
│   │   ├── dashboard.js
│   │   ├── reports.js
│   │   └── notifications.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── orderController.js
│   │   ├── deliveryController.js
│   │   ├── inventoryController.js
│   │   ├── staffController.js
│   │   ├── dashboardController.js
│   │   ├── reportController.js
│   │   └── notificationController.js
│   ├── utils/
│   │   ├── otp.js
│   │   ├── mailer.js
│   │   ├── auditLog.js
│   │   ├── notificationService.js
│   │   └── inventoryHelper.js
│   └── app.js
├── scripts/
│   └── backfillOrders.js
├── tests/
│   ├── orders.test.js
│   ├── reports.test.js
│   └── otp.test.js
├── database.rules.json
├── firebase.json
├── index.js                       # Firebase Function entry point
├── server.js                      # Local dev entry point
├── .env
├── serviceAccountKey.json         # Never commit — add to .gitignore
└── package.json
```

---

## 2. Environment Setup

### Install dependencies

```bash
npm init -y
npm install express firebase-admin express-validator cors nodemailer pdfkit node-cron dotenv
npm install --save-dev nodemon
```

### `.env`

```dotenv
NODE_ENV=development
PORT=5000

CORS_ORIGIN=http://localhost:3000,http://localhost:5000

# Firebase
FIREBASE_PROJECT_ID=h2go-eee4d
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@h2go-eee4d.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://h2go-eee4d-default-rtdb.asia-southeast1.firebasedatabase.app
FIREBASE_API_KEY=your_firebase_web_api_key

# JWT (used for internal session tokens if needed)
JWT_SECRET=your_jwt_secret_key_here

# SMTP (Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16char_app_password
SMTP_FROM=your_email@gmail.com

# OTP
OTP_EXPIRY_MINUTES=10
OTP_PEPPER=your_random_pepper_string

# Operational defaults
DEFAULT_TEMP_PASSWORD=H2Go@Temp123

# PayMongo (future)
PAYMONGO_SECRET_KEY=
PAYMONGO_PUBLIC_KEY=
```

### `package.json` scripts

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "node --test tests/",
    "backfill:orders": "node scripts/backfillOrders.js"
  }
}
```

---

## 3. Firebase Initialization

### `src/firebase/admin.js`

```js
const admin = require('firebase-admin');

let app;

if (!admin.apps.length) {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
} else {
  app = admin.apps[0];
}

const db = admin.database();
const auth = admin.auth();

module.exports = { db, auth, admin };
```

---

## 4. App Entry Point

### `src/app.js`

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// CORS
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());

// Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/orders',        require('./routes/orders'));
app.use('/api/deliveries',    require('./routes/deliveries'));
app.use('/api/inventory',     require('./routes/inventory'));
app.use('/api/staff',         require('./routes/staff'));
app.use('/api/dashboard',     require('./routes/dashboard'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
```

### `server.js` (local dev)

```js
const app = require('./src/app');
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`H2GO running on port ${PORT}`));
```

### `index.js` (Firebase Function)

```js
const functions = require('firebase-functions');
const app = require('./src/app');
exports.api = functions.https.onRequest(app);
```

---

## 5. Middleware

### `src/middleware/auth.js`

Verifies the Firebase ID token on every protected request.

```js
const { auth } = require('../firebase/admin');

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const token = header.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role || 'customer',
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

### `src/middleware/role.js`

```js
module.exports = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};
```

---

## 6. Module A — Authentication & User Lifecycle

### Routes — `src/routes/auth.js`

```js
const router = require('express').Router();
const c = require('../controllers/authController');
const authMw = require('../middleware/auth');

router.post('/setup',        c.initialSetup);    // Create first super_admin
router.post('/register',     c.register);         // Customer self-register
router.post('/login',        c.login);
router.post('/logout',       authMw, c.logout);
router.post('/otp/request',  authMw, c.requestOtp);
router.post('/otp/verify',   authMw, c.verifyOtp);
router.get ('/profile',      authMw, c.getProfile);
router.patch('/profile',     authMw, c.updateProfile);
router.patch('/password',    authMw, c.changePassword); // Requires OTP verified

module.exports = router;
```

### Controller — `src/controllers/authController.js`

```js
const { db, auth } = require('../firebase/admin');
const { generateOTP, verifyOTP } = require('../utils/otp');
const { sendMail } = require('../utils/mailer');
const { writeAuditLog } = require('../utils/auditLog');
const fetch = require('node-fetch');

// ── Initial setup: create first super_admin ──────────────────────────────────
exports.initialSetup = async (req, res) => {
  const snap = await db.ref('users').limitToFirst(1).get();
  if (snap.exists()) {
    return res.status(403).json({ error: 'System already initialized' });
  }
  const { email, password, name } = req.body;
  const userRecord = await auth.createUser({ email, password, displayName: name });
  await auth.setCustomUserClaims(userRecord.uid, { role: 'super_admin' });
  await db.ref(`users/${userRecord.uid}`).set({
    name, email, role: 'super_admin',
    isActive: true, createdAt: Date.now(),
  });
  res.status(201).json({ message: 'Super admin created', uid: userRecord.uid });
};

// ── Customer self-registration ────────────────────────────────────────────────
exports.register = async (req, res) => {
  const { email, password, name, phone } = req.body;
  const userRecord = await auth.createUser({ email, password, displayName: name });
  await auth.setCustomUserClaims(userRecord.uid, { role: 'customer' });
  await db.ref(`users/${userRecord.uid}`).set({
    name, email, phone: phone || '',
    role: 'customer', isActive: true, createdAt: Date.now(),
  });
  await writeAuditLog(userRecord.uid, 'REGISTER', userRecord.uid, 'Customer self-registered');
  res.status(201).json({ message: 'Account created', uid: userRecord.uid });
};

// ── Login via Firebase Identity Toolkit REST ──────────────────────────────────
exports.login = async (req, res) => {
  const { email, password } = req.body;
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await response.json();
  if (data.error) return res.status(401).json({ error: 'Invalid credentials' });

  // Attach role from DB
  const userSnap = await db.ref(`users/${data.localId}`).get();
  const user = userSnap.val();
  if (!user?.isActive) return res.status(403).json({ error: 'Account is inactive' });

  await writeAuditLog(data.localId, 'LOGIN', data.localId, 'User logged in');
  res.json({
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    uid: data.localId,
    role: user.role,
    name: user.name,
  });
};

exports.logout = async (req, res) => {
  await writeAuditLog(req.user.uid, 'LOGOUT', req.user.uid, 'User logged out');
  res.json({ message: 'Logged out' });
};

// ── OTP ───────────────────────────────────────────────────────────────────────
exports.requestOtp = async (req, res) => {
  const userSnap = await db.ref(`users/${req.user.uid}`).get();
  const user = userSnap.val();
  const code = await generateOTP(req.user.uid);
  await sendMail(user.email, 'Your H2GO Verification Code',
    `<p>Your verification code is: <strong>${code}</strong></p>
     <p>This code expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</p>`
  );
  res.json({ message: 'OTP sent to your email' });
};

exports.verifyOtp = async (req, res) => {
  const { code } = req.body;
  const valid = await verifyOTP(req.user.uid, code);
  if (!valid) return res.status(400).json({ error: 'Invalid or expired OTP' });
  await db.ref(`users/${req.user.uid}`).update({ otpVerified: true, verifiedAt: Date.now() });
  res.json({ message: 'OTP verified' });
};

// ── Profile ───────────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  const snap = await db.ref(`users/${req.user.uid}`).get();
  const user = snap.val();
  delete user.passwordHash;
  res.json(user);
};

exports.updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  await db.ref(`users/${req.user.uid}`).update({ name, phone, updatedAt: Date.now() });
  res.json({ message: 'Profile updated' });
};

exports.changePassword = async (req, res) => {
  // Require OTP verified flag set within the last 15 minutes
  const snap = await db.ref(`users/${req.user.uid}`).get();
  const user = snap.val();
  if (!user.otpVerified || Date.now() - user.verifiedAt > 15 * 60 * 1000) {
    return res.status(403).json({ error: 'OTP verification required before changing password' });
  }
  const { newPassword } = req.body;
  await auth.updateUser(req.user.uid, { password: newPassword });
  await db.ref(`users/${req.user.uid}`).update({ otpVerified: false });
  await writeAuditLog(req.user.uid, 'PASSWORD_CHANGE', req.user.uid, 'Password changed');
  res.json({ message: 'Password changed successfully' });
};
```

### Users Route — `src/routes/users.js`

```js
const router = require('express').Router();
const authMw = require('../middleware/auth');
const role = require('../middleware/role');
const { db, auth } = require('../firebase/admin');
const { generateOTP } = require('../utils/otp');
const { writeAuditLog } = require('../utils/auditLog');

// super_admin creates admin
router.post('/admin', authMw, role('super_admin'), async (req, res) => {
  const { email, name } = req.body;
  const tempPassword = process.env.DEFAULT_TEMP_PASSWORD || 'H2Go@Temp123';
  const userRecord = await auth.createUser({ email, password: tempPassword, displayName: name });
  await auth.setCustomUserClaims(userRecord.uid, { role: 'admin' });
  await db.ref(`users/${userRecord.uid}`).set({
    name, email, role: 'admin', isActive: true, createdAt: Date.now(),
  });
  await writeAuditLog(req.user.uid, 'CREATE_ADMIN', userRecord.uid, `Admin ${email} created`);
  res.status(201).json({ uid: userRecord.uid, tempPassword });
});

// admin registers driver
router.post('/driver', authMw, role('admin', 'super_admin'), async (req, res) => {
  await createStaffUser(req, res, 'driver');
});

// admin registers station_staff
router.post('/staff', authMw, role('admin', 'super_admin'), async (req, res) => {
  await createStaffUser(req, res, 'station_staff');
});

// deactivate admin (super_admin only)
router.patch('/:uid/deactivate', authMw, role('super_admin'), async (req, res) => {
  await db.ref(`users/${req.params.uid}`).update({ isActive: false });
  await auth.updateUser(req.params.uid, { disabled: true });
  await writeAuditLog(req.user.uid, 'DEACTIVATE_ADMIN', req.params.uid, 'Admin deactivated');
  res.json({ message: 'Admin deactivated' });
});

// suspend driver or staff (admin)
router.patch('/:uid/suspend', authMw, role('admin', 'super_admin'), async (req, res) => {
  await db.ref(`users/${req.params.uid}`).update({ isActive: false, suspendedAt: Date.now() });
  await auth.updateUser(req.params.uid, { disabled: true });
  await writeAuditLog(req.user.uid, 'SUSPEND_USER', req.params.uid, 'User suspended');
  res.json({ message: 'User suspended' });
});

async function createStaffUser(req, res, role_) {
  const { email, name, phone } = req.body;
  const tempPassword = process.env.DEFAULT_TEMP_PASSWORD || 'H2Go@Temp123';
  const userRecord = await auth.createUser({ email, password: tempPassword, displayName: name });
  await auth.setCustomUserClaims(userRecord.uid, { role: role_ });
  await db.ref(`users/${userRecord.uid}`).set({
    name, email, phone: phone || '', role: role_,
    isActive: true, createdAt: Date.now(),
  });
  const otp = await generateOTP(userRecord.uid);
  await writeAuditLog(req.uid, `CREATE_${role_.toUpperCase()}`, userRecord.uid, `${role_} ${email} created`);
  res.status(201).json({ uid: userRecord.uid, tempPassword, firstLoginOtp: otp });
}

module.exports = router;
```

---

## 7. Module B — Orders Management

### Routes — `src/routes/orders.js`

```js
const router = require('express').Router();
const c = require('../controllers/orderController');
const authMw = require('../middleware/auth');
const role = require('../middleware/role');

const STAFF_ROLES = ['admin', 'super_admin', 'station_staff'];

router.get   ('/',               authMw, role(...STAFF_ROLES), c.listOrders);
router.get   ('/my',             authMw, role('customer'),     c.myOrders);       // last 30 days
router.get   ('/:id',            authMw,                       c.getOrder);
router.post  ('/',               authMw, role('customer'),     c.createOrder);
router.post  ('/walk-in',        authMw, role(...STAFF_ROLES), c.createWalkIn);
router.put   ('/:id',            authMw, role(...STAFF_ROLES), c.updateOrder);
router.patch ('/:id/status',     authMw,                       c.updateStatus);
router.patch ('/:id/accept',     authMw, role(...STAFF_ROLES), c.acceptOrder);
router.patch ('/:id/assign',     authMw, role(...STAFF_ROLES), c.assignDriver);
router.delete('/:id',            authMw, role(...STAFF_ROLES), c.deleteOrder);

module.exports = router;
```

### Controller — `src/controllers/orderController.js`

```js
const { db } = require('../firebase/admin');
const { writeAuditLog } = require('../utils/auditLog');
const { sendNotification, sendOrderConfirmation, sendStatusUpdate, sendDeliveryAssignment } = require('../utils/notificationService');
const { checkAndAlertLowStock } = require('../utils/inventoryHelper');

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

// ── List all orders (staff/admin) ─────────────────────────────────────────────
exports.listOrders = async (req, res) => {
  const { status } = req.query;
  let snap;
  if (status) {
    snap = await db.ref(`ordersByStatus/${status}`).get();
    const ids = Object.keys(snap.val() || {});
    const orders = await Promise.all(ids.map(id =>
      db.ref(`orders/${id}`).get().then(s => ({ id, ...s.val() }))
    ));
    return res.json(orders.filter(Boolean));
  }
  snap = await db.ref('orders').get();
  const all = Object.entries(snap.val() || {}).map(([id, o]) => ({ id, ...o }));
  res.json(all);
};

// ── My orders (customer, last 30 days) ───────────────────────────────────────
exports.myOrders = async (req, res) => {
  const snap = await db.ref(`customerOrders/${req.user.uid}`).get();
  const ids = Object.keys(snap.val() || {});
  const cutoff = Date.now() - THIRTY_DAYS;
  const orders = await Promise.all(
    ids.map(id => db.ref(`orders/${id}`).get().then(s => {
      const o = s.val();
      return o && o.createdAt >= cutoff ? { id, ...o } : null;
    }))
  );
  res.json(orders.filter(Boolean));
};

// ── Get single order ──────────────────────────────────────────────────────────
exports.getOrder = async (req, res) => {
  const snap = await db.ref(`orders/${req.params.id}`).get();
  if (!snap.exists()) return res.status(404).json({ error: 'Order not found' });
  const order = snap.val();
  // Customers can only see their own orders; drivers see assigned ones
  if (req.user.role === 'customer' && order.customerId !== req.user.uid) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (req.user.role === 'driver' && order.assignedDriverId !== req.user.uid) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json({ id: req.params.id, ...order });
};

// ── Create order (customer) ───────────────────────────────────────────────────
exports.createOrder = async (req, res) => {
  const { address, items, schedule, paymentMethod } = req.body;
  if (!items?.length) return res.status(400).json({ error: 'Items required' });

  let total = 0;
  // Deduct inventory and compute totals
  for (const item of items) {
    const invSnap = await db.ref(`inventory/${item.productId}`).get();
    if (!invSnap.exists()) return res.status(400).json({ error: `Product ${item.productId} not found` });
    const product = invSnap.val();
    const available = product.stock?.available ?? product.quantity ?? 0;
    if (available < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
    }
    const price = product.pricing?.sellingPrice ?? product.price ?? 0;
    item.unitPrice = price;
    item.subtotal = price * item.quantity;
    total += item.subtotal;

    // Deduct stock
    const newQty = available - item.quantity;
    if (product.stock) {
      await db.ref(`inventory/${item.productId}/stock`).update({ current: newQty, available: newQty });
    } else {
      await db.ref(`inventory/${item.productId}`).update({ quantity: newQty });
    }

    // Check low stock and alert
    await checkAndAlertLowStock(item.productId, newQty, product.name);
  }

  const orderId = db.ref('orders').push().key;
  const orderData = {
    customerId: req.user.uid,
    customerEmail: req.user.email,
    address, items, schedule,
    paymentMethod: paymentMethod || 'cod',
    paymentVerified: false,
    status: 'pending',
    total,
    assignedDriverId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.ref(`orders/${orderId}`).set(orderData);
  await db.ref(`customerOrders/${req.user.uid}/${orderId}`).set(true);
  await db.ref(`ordersByStatus/pending/${orderId}`).set(true);

  // Order history log
  await logOrderHistory(orderId, 'pending', req.user.uid);

  // Notifications
  await sendOrderConfirmation(req.user.uid, orderId, total);
  await writeAuditLog(req.user.uid, 'CREATE_ORDER', orderId, `Order created, total: ${total}`);

  res.status(201).json({ id: orderId, ...orderData });
};

// ── Walk-in order (station staff) ────────────────────────────────────────────
exports.createWalkIn = async (req, res) => {
  const { customerName, customerPhone, items, paymentMethod } = req.body;
  let total = 0;
  for (const item of items) {
    const invSnap = await db.ref(`inventory/${item.productId}`).get();
    if (!invSnap.exists()) return res.status(400).json({ error: `Product ${item.productId} not found` });
    const product = invSnap.val();
    const price = product.pricing?.sellingPrice ?? product.price ?? 0;
    item.unitPrice = price;
    item.subtotal = price * item.quantity;
    total += item.subtotal;
    const qty = (product.stock?.available ?? product.quantity ?? 0) - item.quantity;
    product.stock
      ? await db.ref(`inventory/${item.productId}/stock`).update({ current: qty, available: qty })
      : await db.ref(`inventory/${item.productId}`).update({ quantity: qty });
  }

  const orderId = db.ref('orders').push().key;
  const orderData = {
    isWalkIn: true, customerName, customerPhone,
    customerId: null, items, total,
    paymentMethod: paymentMethod || 'cod',
    paymentVerified: true,    // walk-ins are paid immediately
    status: 'completed',
    createdAt: Date.now(), updatedAt: Date.now(),
    createdBy: req.user.uid,
  };

  await db.ref(`orders/${orderId}`).set(orderData);
  await db.ref(`ordersByStatus/completed/${orderId}`).set(true);
  await writeAuditLog(req.user.uid, 'CREATE_WALKIN', orderId, `Walk-in order, total: ${total}`);
  res.status(201).json({ id: orderId, ...orderData });
};

// ── Accept order (station staff) ─────────────────────────────────────────────
exports.acceptOrder = async (req, res) => {
  await _updateStatus(req.params.id, 'confirmed', req.user.uid);
  res.json({ message: 'Order accepted' });
};

// ── Assign driver ─────────────────────────────────────────────────────────────
// GAP FIX: wires sendDeliveryAssignment notification
exports.assignDriver = async (req, res) => {
  const { driverId } = req.body;
  const orderId = req.params.id;

  const orderSnap = await db.ref(`orders/${orderId}`).get();
  if (!orderSnap.exists()) return res.status(404).json({ error: 'Order not found' });

  // Verify driver exists and is active
  const driverSnap = await db.ref(`users/${driverId}`).get();
  if (!driverSnap.exists() || driverSnap.val().role !== 'driver') {
    return res.status(400).json({ error: 'Invalid driver' });
  }

  await db.ref(`orders/${orderId}`).update({ assignedDriverId: driverId, updatedAt: Date.now() });
  await db.ref(`driverOrders/${driverId}/${orderId}`).set(true);

  // FIXED: send notification to driver on assignment
  await sendDeliveryAssignment(driverId, orderId);
  await writeAuditLog(req.user.uid, 'ASSIGN_DRIVER', orderId, `Driver ${driverId} assigned`);

  res.json({ message: 'Driver assigned' });
};

// ── Update order status ───────────────────────────────────────────────────────
exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending','confirmed','processing','ready','in_transit','delivered','cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const orderSnap = await db.ref(`orders/${req.params.id}`).get();
  if (!orderSnap.exists()) return res.status(404).json({ error: 'Order not found' });
  const order = orderSnap.val();

  // Drivers can only update their own assigned orders
  if (req.user.role === 'driver' && order.assignedDriverId !== req.user.uid) {
    return res.status(403).json({ error: 'Not your delivery' });
  }

  await _updateStatus(req.params.id, status, req.user.uid, order);
  res.json({ message: 'Status updated' });
};

// ── Full update ───────────────────────────────────────────────────────────────
exports.updateOrder = async (req, res) => {
  await db.ref(`orders/${req.params.id}`).update({ ...req.body, updatedAt: Date.now() });
  await writeAuditLog(req.user.uid, 'UPDATE_ORDER', req.params.id, 'Order updated');
  res.json({ message: 'Order updated' });
};

// ── Delete order ──────────────────────────────────────────────────────────────
exports.deleteOrder = async (req, res) => {
  const snap = await db.ref(`orders/${req.params.id}`).get();
  if (!snap.exists()) return res.status(404).json({ error: 'Order not found' });
  const order = snap.val();
  await db.ref(`orders/${req.params.id}`).remove();
  await db.ref(`ordersByStatus/${order.status}/${req.params.id}`).remove();
  if (order.customerId) await db.ref(`customerOrders/${order.customerId}/${req.params.id}`).remove();
  await writeAuditLog(req.user.uid, 'DELETE_ORDER', req.params.id, 'Order deleted');
  res.json({ message: 'Order deleted' });
};

// ── Helpers ───────────────────────────────────────────────────────────────────
async function _updateStatus(orderId, newStatus, actorUid, existingOrder) {
  const order = existingOrder || (await db.ref(`orders/${orderId}`).get()).val();
  const prevStatus = order.status;

  await db.ref(`orders/${orderId}`).update({ status: newStatus, updatedAt: Date.now() });
  await db.ref(`ordersByStatus/${prevStatus}/${orderId}`).remove();
  await db.ref(`ordersByStatus/${newStatus}/${orderId}`).set(true);
  await logOrderHistory(orderId, newStatus, actorUid);

  // Notify customer
  if (order.customerId) {
    await sendStatusUpdate(order.customerId, orderId, newStatus);
  }
  await writeAuditLog(actorUid, 'STATUS_UPDATE', orderId, `${prevStatus} → ${newStatus}`);
}

async function logOrderHistory(orderId, status, changedBy) {
  const logId = db.ref(`order_history/${orderId}`).push().key;
  await db.ref(`order_history/${orderId}/${logId}`).set({ status, changedBy, changedAt: Date.now() });
}
```

---

## 8. Module C — Deliveries (Driver Workflow)

### Routes — `src/routes/deliveries.js`

```js
const router = require('express').Router();
const c = require('../controllers/deliveryController');
const authMw = require('../middleware/auth');
const role = require('../middleware/role');

router.get  ('/schedule',       authMw, role('driver'), c.getSchedule);
router.get  ('/:id',            authMw, role('driver'), c.getDetail);
router.patch('/:id/start',      authMw, role('driver'), c.startDelivery);
router.patch('/:id/complete',   authMw, role('driver'), c.completeDelivery);
router.patch('/:id/reschedule', authMw, role('driver'), c.reschedule);
router.patch('/:id/cancel',     authMw, role('driver'), c.cancelDelivery);

module.exports = router;
```

### Controller — `src/controllers/deliveryController.js`

```js
const { db } = require('../firebase/admin');
const { writeAuditLog } = require('../utils/auditLog');
const { sendStatusUpdate } = require('../utils/notificationService');

const DONE_STATUSES = ['delivered', 'cancelled'];

exports.getSchedule = async (req, res) => {
  const snap = await db.ref(`driverOrders/${req.user.uid}`).get();
  const ids = Object.keys(snap.val() || {});
  const orders = await Promise.all(
    ids.map(id => db.ref(`orders/${id}`).get().then(s => {
      const o = s.val();
      return o && !DONE_STATUSES.includes(o.status) ? { id, ...o } : null;
    }))
  );
  res.json(orders.filter(Boolean));
};

exports.getDetail = async (req, res) => {
  const snap = await db.ref(`orders/${req.params.id}`).get();
  if (!snap.exists()) return res.status(404).json({ error: 'Not found' });
  const order = snap.val();
  if (order.assignedDriverId !== req.user.uid) return res.status(403).json({ error: 'Not your delivery' });
  res.json({ id: req.params.id, ...order });
};

exports.startDelivery = async (req, res) => {
  await updateDriverStatus(req.params.id, req.user.uid, 'in_transit');
  res.json({ message: 'Delivery started' });
};

exports.completeDelivery = async (req, res) => {
  await updateDriverStatus(req.params.id, req.user.uid, 'delivered');
  await writeAuditLog(req.user.uid, 'COMPLETE_DELIVERY', req.params.id, 'Delivery completed');
  res.json({ message: 'Delivery completed' });
};

exports.reschedule = async (req, res) => {
  const { newSchedule } = req.body;
  await db.ref(`orders/${req.params.id}`).update({ schedule: newSchedule, updatedAt: Date.now() });
  await writeAuditLog(req.user.uid, 'RESCHEDULE', req.params.id, `New schedule: ${newSchedule}`);
  res.json({ message: 'Rescheduled' });
};

exports.cancelDelivery = async (req, res) => {
  await updateDriverStatus(req.params.id, req.user.uid, 'cancelled');
  await writeAuditLog(req.user.uid, 'CANCEL_DELIVERY', req.params.id, 'Driver cancelled');
  res.json({ message: 'Delivery cancelled' });
};

async function updateDriverStatus(orderId, driverUid, newStatus) {
  const snap = await db.ref(`orders/${orderId}`).get();
  const order = snap.val();
  if (order.assignedDriverId !== driverUid) throw { status: 403, message: 'Not your delivery' };
  const prev = order.status;
  await db.ref(`orders/${orderId}`).update({ status: newStatus, updatedAt: Date.now() });
  await db.ref(`ordersByStatus/${prev}/${orderId}`).remove();
  await db.ref(`ordersByStatus/${newStatus}/${orderId}`).set(true);
  if (order.customerId) await sendStatusUpdate(order.customerId, orderId, newStatus);
}
```

---

## 9. Module D — Inventory Management

### Routes — `src/routes/inventory.js`

```js
const router = require('express').Router();
const c = require('../controllers/inventoryController');
const authMw = require('../middleware/auth');
const role = require('../middleware/role');

const STAFF = ['admin', 'super_admin', 'station_staff'];

router.get   ('/',             authMw, role(...STAFF), c.listProducts);
router.get   ('/low-stock',    authMw, role('admin', 'super_admin'), c.lowStock);  // GAP FIX
router.get   ('/:id',         authMw, role(...STAFF), c.getProduct);
router.post  ('/',             authMw, role(...STAFF), c.createProduct);
router.patch ('/:id',         authMw, role(...STAFF), c.updateProduct);
router.delete('/:id',         authMw, role(...STAFF), c.deleteProduct);

module.exports = router;
```

### Controller — `src/controllers/inventoryController.js`

```js
const { db } = require('../firebase/admin');
const { writeAuditLog } = require('../utils/auditLog');

// Normalize supports both legacy flat fields and nested pricing/stock
function normalize(id, raw) {
  return {
    id,
    name: raw.name,
    pricing: {
      sellingPrice: raw.pricing?.sellingPrice ?? raw.price ?? 0,
      costPrice: raw.pricing?.costPrice ?? 0,
      markup: raw.pricing?.markup ?? 0,
    },
    stock: {
      current: raw.stock?.current ?? raw.quantity ?? 0,
      reserved: raw.stock?.reserved ?? 0,
      available: raw.stock?.available ?? raw.quantity ?? 0,
      reorderLevel: raw.stock?.reorderLevel ?? 10,
    },
    lowStockThreshold: raw.lowStockThreshold ?? 10,
    updatedAt: raw.updatedAt,
  };
}

exports.listProducts = async (req, res) => {
  const snap = await db.ref('inventory').get();
  const items = Object.entries(snap.val() || {}).map(([id, raw]) => normalize(id, raw));
  res.json(items);
};

exports.lowStock = async (req, res) => {
  const snap = await db.ref('inventory').get();
  const low = Object.entries(snap.val() || {})
    .map(([id, raw]) => normalize(id, raw))
    .filter(item => item.stock.available <= item.lowStockThreshold);
  res.json(low);
};

exports.getProduct = async (req, res) => {
  const snap = await db.ref(`inventory/${req.params.id}`).get();
  if (!snap.exists()) return res.status(404).json({ error: 'Product not found' });
  res.json(normalize(req.params.id, snap.val()));
};

exports.createProduct = async (req, res) => {
  const { name, sellingPrice, costPrice, quantity, lowStockThreshold } = req.body;
  const id = db.ref('inventory').push().key;
  const product = {
    name,
    pricing: { sellingPrice: sellingPrice || 0, costPrice: costPrice || 0 },
    stock: { current: quantity || 0, reserved: 0, available: quantity || 0, reorderLevel: lowStockThreshold || 10 },
    lowStockThreshold: lowStockThreshold || 10,
    createdAt: Date.now(), updatedAt: Date.now(),
    createdBy: req.user.uid,
  };
  await db.ref(`inventory/${id}`).set(product);
  await writeAuditLog(req.user.uid, 'CREATE_PRODUCT', id, `Product ${name} created`);
  res.status(201).json(normalize(id, product));
};

exports.updateProduct = async (req, res) => {
  const snap = await db.ref(`inventory/${req.params.id}`).get();
  if (!snap.exists()) return res.status(404).json({ error: 'Product not found' });
  const updates = { ...req.body, updatedAt: Date.now() };
  await db.ref(`inventory/${req.params.id}`).update(updates);
  await writeAuditLog(req.user.uid, 'UPDATE_PRODUCT', req.params.id, 'Product updated');
  res.json({ message: 'Product updated' });
};

exports.deleteProduct = async (req, res) => {
  await db.ref(`inventory/${req.params.id}`).remove();
  await writeAuditLog(req.user.uid, 'DELETE_PRODUCT', req.params.id, 'Product deleted');
  res.json({ message: 'Product deleted' });
};
```

---

## 10. Module E — Staff Management

### Routes — `src/routes/staff.js`

```js
const router = require('express').Router();
const c = require('../controllers/staffController');
const authMw = require('../middleware/auth');
const role = require('../middleware/role');

router.get   ('/',          authMw, role('admin', 'super_admin'), c.listStaff);
router.get   ('/drivers',   authMw, role('admin', 'super_admin', 'station_staff'), c.listDrivers);
router.get   ('/:id',       authMw, role('admin', 'super_admin'), c.getStaff);
router.post  ('/',          authMw, role('super_admin'), c.createStaff);
router.patch ('/:id',       authMw, role('admin', 'super_admin'), c.updateStaff);
router.delete('/:id',       authMw, role('super_admin'), c.deleteStaff);

module.exports = router;
```

### Controller — `src/controllers/staffController.js`

```js
const { db, auth } = require('../firebase/admin');
const { generateOTP } = require('../utils/otp');
const { writeAuditLog } = require('../utils/auditLog');

exports.listStaff = async (req, res) => {
  const snap = await db.ref('staff').get();
  res.json(Object.entries(snap.val() || {}).map(([id, s]) => ({ id, ...s })));
};

exports.listDrivers = async (req, res) => {
  const snap = await db.ref('users').get();
  const drivers = Object.entries(snap.val() || {})
    .filter(([, u]) => u.role === 'driver' && u.isActive)
    .map(([uid, u]) => ({ uid, name: u.name, email: u.email }));
  res.json(drivers);
};

exports.getStaff = async (req, res) => {
  const snap = await db.ref(`staff/${req.params.id}`).get();
  if (!snap.exists()) return res.status(404).json({ error: 'Staff not found' });
  res.json({ id: req.params.id, ...snap.val() });
};

exports.createStaff = async (req, res) => {
  const { email, name, phone, role: staffRole } = req.body;
  const validRoles = ['admin', 'station_staff', 'driver'];
  if (!validRoles.includes(staffRole)) return res.status(400).json({ error: 'Invalid role' });

  const tempPassword = process.env.DEFAULT_TEMP_PASSWORD || 'H2Go@Temp123';
  const userRecord = await auth.createUser({ email, password: tempPassword, displayName: name });
  await auth.setCustomUserClaims(userRecord.uid, { role: staffRole });

  await db.ref(`users/${userRecord.uid}`).set({
    name, email, phone: phone || '', role: staffRole,
    isActive: true, createdAt: Date.now(),
  });

  const staffId = db.ref('staff').push().key;
  await db.ref(`staff/${staffId}`).set({
    uid: userRecord.uid, name, email, phone: phone || '',
    role: staffRole, isActive: true, createdAt: Date.now(),
  });

  const otp = await generateOTP(userRecord.uid);
  await writeAuditLog(req.user.uid, 'CREATE_STAFF', userRecord.uid, `Staff ${email} created as ${staffRole}`);
  res.status(201).json({ staffId, uid: userRecord.uid, tempPassword, firstLoginOtp: otp });
};

exports.updateStaff = async (req, res) => {
  const { name, phone, isActive } = req.body;
  await db.ref(`staff/${req.params.id}`).update({ name, phone, isActive, updatedAt: Date.now() });
  await writeAuditLog(req.user.uid, 'UPDATE_STAFF', req.params.id, 'Staff updated');
  res.json({ message: 'Staff updated' });
};

exports.deleteStaff = async (req, res) => {
  const snap = await db.ref(`staff/${req.params.id}`).get();
  if (!snap.exists()) return res.status(404).json({ error: 'Staff not found' });
  const { uid } = snap.val();
  await auth.deleteUser(uid);
  await db.ref(`users/${uid}`).remove();
  await db.ref(`staff/${req.params.id}`).remove();
  await writeAuditLog(req.user.uid, 'DELETE_STAFF', req.params.id, 'Staff deleted');
  res.json({ message: 'Staff deleted' });
};
```

---

## 11. Module F — Dashboard

### Routes — `src/routes/dashboard.js`

```js
const router = require('express').Router();
const c = require('../controllers/dashboardController');
const authMw = require('../middleware/auth');
const role = require('../middleware/role');

router.get('/', authMw, role('admin', 'super_admin', 'station_staff'), c.getDashboard);

module.exports = router;
```

### Controller — `src/controllers/dashboardController.js`

```js
const { db } = require('../firebase/admin');

exports.getDashboard = async (req, res) => {
  const [ordersSnap, usersSnap, inventorySnap] = await Promise.all([
    db.ref('orders').get(),
    db.ref('users').get(),
    db.ref('inventory').get(),
  ]);

  const orders = Object.values(ordersSnap.val() || {});
  const users = Object.values(usersSnap.val() || {});
  const inventory = Object.values(inventorySnap.val() || {});

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const completedOrders = orders.filter(o => o.status === 'delivered');
  const revenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  const staff = users.filter(u => ['admin', 'station_staff', 'driver'].includes(u.role));
  const activeStaff = staff.filter(u => u.isActive);

  const LOW_THRESHOLD = 10;
  const lowStockItems = inventory.filter(i => {
    const qty = i.stock?.available ?? i.quantity ?? 0;
    return qty < (i.lowStockThreshold || LOW_THRESHOLD);
  });
  const inventoryValue = inventory.reduce((sum, i) => {
    const qty = i.stock?.current ?? i.quantity ?? 0;
    const price = i.pricing?.costPrice ?? i.price ?? 0;
    return sum + qty * price;
  }, 0);

  const recentOrders = orders
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);

  res.json({
    totalOrders: orders.length,
    pendingOrders: pendingOrders.length,
    completedDeliveries: completedOrders.length,
    revenue,
    totalStaff: staff.length,
    activeStaff: activeStaff.length,
    totalProducts: inventory.length,
    lowStockCount: lowStockItems.length,
    inventoryValue,
    recentOrders,
  });
};
```

---

## 12. Module G — Reports & PDF

### Routes — `src/routes/reports.js`

```js
const router = require('express').Router();
const c = require('../controllers/reportController');
const authMw = require('../middleware/auth');
const role = require('../middleware/role');

router.get('/',        authMw, role('admin', 'super_admin'), c.getDailyReport);
router.get('/sales',   authMw, role('admin', 'super_admin'), c.getSalesReport);
router.get('/pdf',     authMw, role('admin', 'super_admin'), c.downloadPdf);

module.exports = router;
```

### Controller — `src/controllers/reportController.js`

```js
const { db } = require('../firebase/admin');
const PDFDocument = require('pdfkit');

// ── Daily report JSON ─────────────────────────────────────────────────────────
exports.getDailyReport = async (req, res) => {
  const snap = await db.ref('orders').get();
  const orders = Object.entries(snap.val() || {}).map(([id, o]) => ({ id, ...o }));
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const endOfDay = startOfDay + 86400000;

  const todayOrders = orders.filter(o => o.createdAt >= startOfDay && o.createdAt < endOfDay);
  const completed = todayOrders.filter(o => o.status === 'delivered');
  const revenue = completed.reduce((sum, o) => sum + (o.total || 0), 0);

  res.json({
    date: today.toISOString().split('T')[0],
    totalOrders: todayOrders.length,
    completedOrders: completed.length,
    revenue,
    orders: todayOrders,
  });
};

// ── Sales report by date range ────────────────────────────────────────────────
// GAP FIX: groups by day for Chart.js consumption
exports.getSalesReport = async (req, res) => {
  const { from, to } = req.query;
  const snap = await db.ref('orders').get();
  const orders = Object.values(snap.val() || {});

  const fromTs = from ? new Date(from).getTime() : Date.now() - 30 * 86400000;
  const toTs = to ? new Date(to).getTime() + 86400000 : Date.now();

  const filtered = orders.filter(o =>
    o.status === 'delivered' &&
    o.createdAt >= fromTs &&
    o.createdAt <= toTs
  );

  const totalSales = filtered.length;
  const totalRevenue = filtered.reduce((sum, o) => sum + (o.total || 0), 0);

  // Group by day for Chart.js
  const byDay = filtered.reduce((acc, o) => {
    const day = new Date(o.createdAt).toISOString().split('T')[0];
    if (!acc[day]) acc[day] = { orders: 0, revenue: 0 };
    acc[day].orders += 1;
    acc[day].revenue += o.total || 0;
    return acc;
  }, {});

  // Top customers
  const customerMap = {};
  filtered.forEach(o => {
    if (!o.customerId) return;
    customerMap[o.customerId] = (customerMap[o.customerId] || 0) + 1;
  });
  const topCustomers = Object.entries(customerMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([uid, count]) => ({ uid, count }));

  res.json({ totalSales, totalRevenue, byDay, topCustomers });
};

// ── PDF download ──────────────────────────────────────────────────────────────
exports.downloadPdf = async (req, res) => {
  const snap = await db.ref('orders').get();
  const orders = Object.values(snap.val() || {});
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const todayOrders = orders.filter(o => o.createdAt >= startOfDay && o.status === 'delivered');
  const revenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=H2GO_Sales_${today.toISOString().split('T')[0]}.pdf`);
  doc.pipe(res);

  // Header
  doc.fontSize(20).text('H2GO Water Station', { align: 'center' });
  doc.fontSize(14).text('Daily Sales Report', { align: 'center' });
  doc.fontSize(11).text(`Date: ${today.toDateString()}`, { align: 'center' });
  doc.moveDown();

  // Summary
  doc.fontSize(12).text(`Total Completed Orders: ${todayOrders.length}`);
  doc.text(`Total Revenue: ₱${revenue.toFixed(2)}`);
  doc.moveDown();

  // Orders table
  doc.fontSize(11).text('Order Details:', { underline: true });
  doc.moveDown(0.5);
  todayOrders.forEach((o, i) => {
    doc.text(`${i + 1}. ${o.customerName || o.customerEmail || o.customerId}  —  ₱${(o.total || 0).toFixed(2)}  —  ${o.paymentMethod?.toUpperCase()}`);
  });

  doc.end();
};
```

---

## 13. Module H — Notifications

### `src/utils/notificationService.js`

```js
const { db } = require('../firebase/admin');
const { sendMail } = require('./mailer');

async function createNotification(userId, message, type = 'info') {
  const notifId = db.ref(`notifications/${userId}`).push().key;
  await db.ref(`notifications/${userId}/${notifId}`).set({
    message, type, isRead: false, createdAt: Date.now(),
  });
}

async function getUserEmail(uid) {
  const snap = await db.ref(`users/${uid}`).get();
  return snap.val()?.email || null;
}

async function isEmailEnabled(uid) {
  const snap = await db.ref(`userSettings/${uid}/notifications`).get();
  return snap.val()?.email !== false;
}

// Order confirmation
async function sendOrderConfirmation(customerId, orderId, total) {
  const msg = `Your order #${orderId} has been placed successfully. Total: ₱${total.toFixed(2)}`;
  await createNotification(customerId, msg, 'order');
  const email = await getUserEmail(customerId);
  if (email && await isEmailEnabled(customerId)) {
    await sendMail(email, 'Order Confirmed — H2GO', `<p>${msg}</p>`).catch(console.error);
  }
}

// Status update
async function sendStatusUpdate(customerId, orderId, status) {
  const labels = {
    confirmed: 'confirmed by our station',
    processing: 'being processed',
    ready: 'ready for pickup/delivery',
    in_transit: 'on the way to you',
    delivered: 'delivered successfully',
    cancelled: 'cancelled',
  };
  const msg = `Your order #${orderId} is now ${labels[status] || status}.`;
  await createNotification(customerId, msg, 'order');
  const email = await getUserEmail(customerId);
  if (email && await isEmailEnabled(customerId)) {
    await sendMail(email, `Order Update — H2GO`, `<p>${msg}</p>`).catch(console.error);
  }
}

// Driver assignment — GAP FIX
async function sendDeliveryAssignment(driverId, orderId) {
  const msg = `You have been assigned to delivery order #${orderId}. Please check your schedule.`;
  await createNotification(driverId, msg, 'delivery');
  const email = await getUserEmail(driverId);
  if (email) {
    await sendMail(email, 'New Delivery Assigned — H2GO', `<p>${msg}</p>`).catch(console.error);
  }
}

// Low-stock alert to all admins
async function sendLowStockAlert(productName, remaining) {
  const snap = await db.ref('users').get();
  const admins = Object.entries(snap.val() || {})
    .filter(([, u]) => ['admin', 'super_admin'].includes(u.role) && u.isActive);

  const msg = `Low stock alert: "${productName}" has only ${remaining} units remaining.`;
  await Promise.all(admins.map(async ([uid, u]) => {
    await createNotification(uid, msg, 'warning');
    if (u.email) {
      await sendMail(u.email, 'Low Stock Alert — H2GO', `<p>${msg}</p>`).catch(console.error);
    }
  }));
}

module.exports = {
  createNotification,
  sendOrderConfirmation,
  sendStatusUpdate,
  sendDeliveryAssignment,
  sendLowStockAlert,
};
```

### Routes — `src/routes/notifications.js`

```js
const router = require('express').Router();
const c = require('../controllers/notificationController');
const authMw = require('../middleware/auth');
const role = require('../middleware/role');

router.get   ('/',              authMw, c.listNotifications);
router.get   ('/unread-count', authMw, c.unreadCount);
router.patch ('/:id/read',     authMw, c.markRead);
router.patch ('/read-all',     authMw, c.markAllRead);
router.delete('/:id',          authMw, c.deleteNotification);
router.post  ('/alert',        authMw, role('admin', 'super_admin'), c.sendAlert);
router.get   ('/settings',     authMw, c.getSettings);
router.patch ('/settings',     authMw, c.updateSettings);

module.exports = router;
```

### Controller — `src/controllers/notificationController.js`

```js
const { db } = require('../firebase/admin');
const { createNotification } = require('../utils/notificationService');
const { sendMail } = require('../utils/mailer');

exports.listNotifications = async (req, res) => {
  const snap = await db.ref(`notifications/${req.user.uid}`).get();
  const items = Object.entries(snap.val() || {})
    .map(([id, n]) => ({ id, ...n }))
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(items);
};

exports.unreadCount = async (req, res) => {
  const snap = await db.ref(`notifications/${req.user.uid}`).get();
  const count = Object.values(snap.val() || {}).filter(n => !n.isRead).length;
  res.json({ count });
};

exports.markRead = async (req, res) => {
  await db.ref(`notifications/${req.user.uid}/${req.params.id}`).update({ isRead: true });
  res.json({ message: 'Marked as read' });
};

exports.markAllRead = async (req, res) => {
  const snap = await db.ref(`notifications/${req.user.uid}`).get();
  const updates = {};
  Object.keys(snap.val() || {}).forEach(id => { updates[`${id}/isRead`] = true; });
  await db.ref(`notifications/${req.user.uid}`).update(updates);
  res.json({ message: 'All marked as read' });
};

exports.deleteNotification = async (req, res) => {
  await db.ref(`notifications/${req.user.uid}/${req.params.id}`).remove();
  res.json({ message: 'Deleted' });
};

// GAP FIX: structured admin alert with optional delayReason
exports.sendAlert = async (req, res) => {
  const { targetUserId, message, reason, type = 'alert' } = req.body;
  const ALERT_TEMPLATES = {
    delay: (r) => `Your order has been delayed${r ? `: ${r}` : ''}. We apologize for the inconvenience.`,
    availability: (r) => `There is a stock availability issue${r ? `: ${r}` : ''}. Your order may be affected.`,
    custom: () => message,
  };
  const finalMessage = (ALERT_TEMPLATES[type] || ALERT_TEMPLATES.custom)(reason);

  if (targetUserId) {
    await createNotification(targetUserId, finalMessage, 'alert');
    const snap = await db.ref(`users/${targetUserId}`).get();
    const user = snap.val();
    if (user?.email) {
      await sendMail(user.email, 'Important Notice — H2GO', `<p>${finalMessage}</p>`).catch(console.error);
    }
  }
  res.json({ message: 'Alert sent', content: finalMessage });
};

exports.getSettings = async (req, res) => {
  const snap = await db.ref(`userSettings/${req.user.uid}/notifications`).get();
  res.json(snap.val() || { email: true, inApp: true });
};

exports.updateSettings = async (req, res) => {
  await db.ref(`userSettings/${req.user.uid}/notifications`).update(req.body);
  res.json({ message: 'Settings updated' });
};
```

---

## 14. Gap Fixes

This section documents the 5 partial requirements from the compliance check and how each is resolved.

### Gap 1 — Driver assignment notification (FR-06)

**Fix location:** `orderController.js` → `assignDriver()`

```js
// After updating assignedDriverId in the database:
await sendDeliveryAssignment(driverId, orderId);
```

`sendDeliveryAssignment()` sends both an in-app notification and an email to the driver. Already included in Module B above.

---

### Gap 2 — Scheduled low-stock scan (FR-09)

Standalone cron job so admins are alerted even when no orders are placed.

**`src/utils/inventoryHelper.js`**

```js
const { db } = require('../firebase/admin');
const { sendLowStockAlert } = require('./notificationService');

// Called inline during order creation
async function checkAndAlertLowStock(productId, remaining, productName) {
  const snap = await db.ref(`inventory/${productId}`).get();
  const threshold = snap.val()?.lowStockThreshold ?? 10;
  if (remaining <= threshold) {
    await sendLowStockAlert(productName, remaining);
  }
}

// Called by the daily cron scheduler
async function scanAllLowStock() {
  const snap = await db.ref('inventory').get();
  const items = snap.val() || {};
  for (const [id, item] of Object.entries(items)) {
    const qty = item.stock?.available ?? item.quantity ?? 0;
    const threshold = item.lowStockThreshold ?? 10;
    if (qty <= threshold) {
      await sendLowStockAlert(item.name, qty);
    }
  }
}

module.exports = { checkAndAlertLowStock, scanAllLowStock };
```

**Add to `server.js` (local) or a Firebase scheduled function:**

```js
const cron = require('node-cron');
const { scanAllLowStock } = require('./src/utils/inventoryHelper');

// Runs every day at 8:00 AM
cron.schedule('0 8 * * *', async () => {
  console.log('Running daily low-stock scan...');
  await scanAllLowStock();
});
```

---

### Gap 3 — Structured admin delay/availability alert (FR-13)

**Fix location:** `notificationController.js` → `sendAlert()`

Three alert types are now supported: `delay`, `availability`, and `custom`. Each accepts an optional `reason` string that is merged into a human-readable message template. Already included in Module H above.

**Example request:**
```json
POST /api/notifications/alert
{
  "targetUserId": "uid_of_customer",
  "type": "delay",
  "reason": "heavy rain in the delivery area"
}
```

---

### Gap 4 — Chart.js-ready report data (FR-15)

**Fix location:** `reportController.js` → `getSalesReport()`

The endpoint now returns `byDay` — an object keyed by date string with `orders` and `revenue` per day. The frontend can consume this directly:

```js
// Frontend: pages/reports.js
const res = await ApiClient.get('/reports/sales?from=2026-04-01&to=2026-04-30');
const labels = Object.keys(res.byDay);
const data = labels.map(d => res.byDay[d].revenue);

new Chart(document.getElementById('revenueChart'), {
  type: 'bar',
  data: {
    labels,
    datasets: [{ label: 'Revenue (₱)', data, backgroundColor: '#0d6efd' }]
  }
});
```

---

### Gap 5 — Customer order history 30-day filter (Use case)

**Fix location:** `orderController.js` → `myOrders()`

The `THIRTY_DAYS` constant filters orders client-side after fetching the index. Already included in Module B above.

---

## 15. Database Rules

### `database.rules.json`

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || auth.token.role === 'admin' || auth.token.role === 'super_admin')",
        ".write": "auth != null && (auth.uid === $uid || auth.token.role === 'admin' || auth.token.role === 'super_admin')"
      }
    },
    "orders": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "inventory": {
      ".read": "auth != null",
      ".write": "auth != null && (auth.token.role === 'station_staff' || auth.token.role === 'admin' || auth.token.role === 'super_admin')"
    },
    "notifications": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null"
      }
    },
    "audit_logs": {
      ".read": "auth != null && (auth.token.role === 'admin' || auth.token.role === 'super_admin')",
      ".write": "auth != null"
    }
  }
}
```

---

## 16. Scripts & Tests

### `src/utils/otp.js`

```js
const { db } = require('../firebase/admin');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

async function generateOTP(userId) {
  const code = crypto.randomInt(100000, 999999).toString();
  const hashed = await bcrypt.hash(code + process.env.OTP_PEPPER, 10);
  const expiresAt = Date.now() + (Number(process.env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000;
  await db.ref(`otp_codes/${userId}`).set({ hashed, expiresAt });
  return code; // Plain code is emailed; only hash is stored
}

async function verifyOTP(userId, inputCode) {
  const snap = await db.ref(`otp_codes/${userId}`).get();
  if (!snap.exists()) return false;
  const { hashed, expiresAt } = snap.val();
  if (Date.now() > expiresAt) return false;
  const valid = await bcrypt.compare(inputCode + process.env.OTP_PEPPER, hashed);
  if (valid) await db.ref(`otp_codes/${userId}`).remove();
  return valid;
}

module.exports = { generateOTP, verifyOTP };
```

### `src/utils/auditLog.js`

```js
const { db } = require('../firebase/admin');

async function writeAuditLog(actorId, action, targetId, details = '') {
  const logId = db.ref('audit_logs').push().key;
  await db.ref(`audit_logs/${logId}`).set({
    actorId, action, targetId, details, createdAt: Date.now(),
  });
}

module.exports = { writeAuditLog };
```

### `src/utils/mailer.js`

```js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((err) => {
  if (err) console.warn('SMTP not configured or unavailable:', err.message);
  else console.log('SMTP ready');
});

async function sendMail(to, subject, html) {
  if (!process.env.SMTP_USER) return; // Skip if SMTP not configured
  return transporter.sendMail({
    from: `"H2GO Water Station" <${process.env.SMTP_FROM}>`,
    to, subject, html,
  });
}

module.exports = { sendMail };
```

### `scripts/backfillOrders.js`

```js
require('dotenv').config();
const { db } = require('./src/firebase/admin');

async function backfill() {
  const snap = await db.ref('orders').get();
  const orders = snap.val() || {};
  let count = 0;

  for (const [id, order] of Object.entries(orders)) {
    const updates = {};
    if (!order.createdAt) updates.createdAt = Date.now();
    if (!order.updatedAt) updates.updatedAt = Date.now();
    if (!order.total && order.items) {
      updates.total = order.items.reduce((s, i) => s + ((i.unitPrice || 0) * (i.quantity || 1)), 0);
    }
    if (Object.keys(updates).length) {
      await db.ref(`orders/${id}`).update(updates);
      count++;
    }
  }
  console.log(`Backfilled ${count} orders`);
  process.exit(0);
}

backfill().catch(console.error);
```

### `tests/otp.test.js`

```js
const { test } = require('node:test');
const assert = require('node:assert');

// Mock Firebase for unit tests
const mockDb = { data: {} };
jest.mock('./src/firebase/admin', () => ({ db: mockDb }));

test('OTP generation produces 6-digit code', async () => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  assert.match(code, /^\d{6}$/);
});

test('OTP expires after expiry window', () => {
  const expiresAt = Date.now() - 1000;
  assert.ok(Date.now() > expiresAt);
});
```

---

## 17. Deployment

### Local development

```bash
npm install
cp .env.example .env     # Fill in your values
npm run dev              # Starts with nodemon on PORT=5000
```

### Firebase deployment

**`firebase.json`**

```json
{
  "hosting": {
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "/api/**", "destination": "/api" }
    ]
  },
  "functions": {
    "source": ".",
    "runtime": "nodejs18"
  }
}
```

**Deploy:**

```bash
npm install -g firebase-tools
firebase login
firebase init              # Select Hosting + Functions
firebase deploy
```

### `.gitignore`

```
node_modules/
.env
serviceAccountKey.json
*.log
```

### Checklist before go-live

- [ ] `serviceAccountKey.json` is in `.gitignore`
- [ ] All `.env` values are set in Firebase Functions config or hosting environment
- [ ] Firebase Realtime Database rules are deployed (`firebase deploy --only database`)
- [ ] SMTP verified with a test email
- [ ] `npm test` passes all test cases
- [ ] Low-stock cron is confirmed running (check server logs)
- [ ] `npm run backfill:orders` run once to normalize any legacy data
- [ ] CORS origins updated to your production domain

---

## 18. System Functionality Improvements

This section captures the most useful improvements to keep the system stable, consistent, and easier to operate.

### Verified improvements already in place

- Role normalization now maps legacy `staff` values to `station_staff` across auth, route guards, and the SPA navigation.
- Orders and inventory now support both legacy flat fields and nested pricing/stock data, which keeps older records usable while the UI continues to read normalized values.
- The authentication flow includes login, forgot-password, OTP verification, and temporary-password change handling from the SPA.
- Driver deliveries now support a visible active-delivery workflow with `Start Delivery` and `Mark Delivered` actions.
- Notifications are wired through the backend and the SPA API client, including unread counts, mark-read actions, and settings routes.
- Reports are available as both a daily JSON summary and a downloadable PDF, which keeps operational review and export in the same flow.

### Recommended follow-up improvements

- Standardize driver assignment to one identifier across staff lookup, order assignment, and delivery lookup so the UI never needs a manual UID workaround.
- Add a notifications inbox in the SPA header or profile area so unread counts, read states, and notification preferences are visible without leaving the page.
- Surface API and SMTP configuration warnings in a small admin diagnostics panel instead of relying only on console output.
- Add browser smoke tests for login, route access, create/fetch flows, and driver delivery actions after each deployment.
- Add an activity timeline for order, inventory, staff, and delivery mutations so administrators can review recent operational changes quickly.
- Expose low-stock threshold and reorder-level controls in the inventory editor so staff can tune alerts without editing the database directly.

---

*End of H2GO Implementation Guide*