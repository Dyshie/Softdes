# Water Station Management System - System Architecture

## Overview
The Water Station Management System (H2GO) is a comprehensive web-based application built with Express.js backend and Firebase services, featuring a Single Page Application (SPA) frontend. The system manages water station operations including order processing, inventory management, staff coordination, delivery tracking, and customer management.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ index.html + app.js (initialization)                     │  │
│  │ ├─ Check auth status                                     │  │
│  │ ├─ Render login OR router.init()                        │  │
│  │ └─ Show/hide navigation based on role                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Router (hash-based navigation)                           │  │
│  │ ├─ #/dashboard → renderDashboard()                      │  │
│  │ ├─ #/orders → renderOrders()                            │  │
│  │ ├─ #/inventory → renderInventory()                      │  │
│  │ └─ etc.                                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ApiClient (centralized REST communication)              │  │
│  │ ├─ setToken(idToken) → localStorage                     │  │
│  │ ├─ request(method, endpoint, data)                      │  │
│  │ └─ Namespace methods: auth, orders, inventory, etc.     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↕ HTTP/JSON
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS.JS BACKEND                           │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ CORS Middleware → Request Body Parser                    │  │
│ │ ├─ Allow localhost + production domains                 │  │
│ │ └─ JSON content-type                                     │  │
│ └──────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Route Modules (7 groups)                                 │  │
│ │ ├─ /api/auth          (login, register, users)          │  │
│ │ ├─ /api/orders        (CRUD with inventory)             │  │
│ │ ├─ /api/inventory     (products management)             │  │
│ │ ├─ /api/staff         (staff CRUD)                       │  │
│ │ ├─ /api/dashboard     (stats aggregation)               │  │
│ │ ├─ /api/notifications (user notifications)             │  │
│ │ └─ /api/reports       (PDF generation)                  │  │
│ └──────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Middleware Pipeline (per route)                          │  │
│ │ 1. Authentication Middleware                             │  │
│ │    └─ Verify Firebase idToken                            │  │
│ │ 2. Authorization Middleware                              │  │
│ │    └─ Check user role                                    │  │
│ │ 3. Express Validator                                     │  │
│ │    └─ Validate request data                              │  │
│ │ 4. Route Handler                                         │  │
│ │    └─ Business logic                                     │  │
│ │ 5. Error Handler                                         │  │
│ │    └─ Catch & format errors                              │  │
│ └──────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Firebase Admin SDK                                        │  │
│ │ ├─ auth → Firebase Auth Service                          │  │
│ │ │   └─ verifyIdToken(), createUser(), setCustomClaims()  │  │
│ │ ├─ database → Firebase Realtime DB                       │  │
│ │ │   └─ read/write/transaction operations                 │  │
│ │ └─ admin.auth(), admin.database()                        │  │
│ └──────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Services                                                  │  │
│ │ ├─ NotificationService                                   │  │
│ │ │   ├─ sendEmail() → Nodemailer SMTP                     │  │
│ │ │   ├─ storeNotification() → Database                    │  │
│ │ │   └─ emailTemplates (HTML)                             │  │
│ │ └─ Report Generation                                     │  │
│ │     └─ PDFKit PDF creation                               │  │
│ └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                   FIREBASE SERVICES                             │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Firebase Authentication                                  │  │
│ │ ├─ User account management                              │  │
│ │ ├─ Password hashing & JWT generation                    │  │
│ │ └─ Custom claims (roles)                                │  │
│ └──────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Firebase Realtime Database                              │  │
│ │ ├─ JSON document storage                                │  │
│ │ ├─ Hierarchical: /users, /orders, /inventory, etc.      │  │
│ │ ├─ Real-time listeners (for future WebSocket support)   │  │
│ │ ├─ Transactions (for inventory atomicity)               │  │
│ │ └─ Security Rules (role-based access)                   │  │
│ └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 1. Backend Architecture

### Core Framework
- **Runtime**: Node.js with Express.js 4.18.2
- **Entry Point**: `server.js`
- **Configuration**: Environment variables via dotenv

### Key Backend Components

#### Configuration Layer
**File**: `config/firebase.js`
- Firebase Admin SDK initialization
- Dual credential loading: Firebase service account JSON or environment variables
- Exports: `admin`, `database`, `auth` instances
- Fallback logic for development/production flexibility

#### Middleware Stack
**Authentication** `middleware/authentication.js`:
- JWT-based token verification via Firebase `auth.verifyIdToken()`
- Extracts `uid`, `email`, `role` from decoded token
- Passes user context to routes via `req.user`

**Authorization** `middleware/authorization.js`:
- `requireRole()` middleware function
- Role-based access control for protected routes
- Validates user roles against allowed roles per endpoint

**Error Handling** `middleware/errorHandler.js`:
- Centralized error handling with `AppError` class
- HTTP status code mapping
- Environment-aware error responses (dev vs production)
- Comprehensive error logging with context

#### API Routes (7 modules)
1. **`routes/auth.js`** - Authentication (5 endpoints)
   - `GET /setup-status` - Check if initial registration allowed
   - `POST /login` - Firebase email/password authentication
   - `POST /register` - First-time super admin setup only
   - `POST /users` - Create user (super_admin only)
   - `GET /me` - Get current user profile

2. **`routes/orders.js`** - Order Management (6+ endpoints)
   - `GET /` - List all orders
   - `GET /:id` - Get single order
   - `POST /` - Create order with inventory deduction
   - `PUT /:id` - Update order status
   - `DELETE /:id` - Cancel order
   - Uses transactions for inventory consistency

3. **`routes/inventory.js`** - Inventory Management (5+ endpoints)
   - `GET /` - List all products
   - `GET /:id` - Get single product
   - `POST /` - Add product with pricing & stock
   - `PUT /:id` - Update product
   - `DELETE /:id` - Archive product

4. **`routes/staff.js`** - Staff Management (5+ endpoints)
   - `GET /` - List staff members
   - `GET /:id` - Get staff details
   - `POST /` - Add new staff
   - `PUT /:id` - Update staff info
   - `DELETE /:id` - Remove staff

5. **`routes/dashboard.js`** - Analytics (2 endpoints)
   - `GET /stats` - Aggregated KPIs (orders, revenue, staff, inventory)
   - `GET /recent-orders` - Last 5 orders sorted by date

6. **`routes/notifications.js`** - Notifications (4 endpoints)
   - `GET /` - List user notifications
   - `GET /unread-count` - Count unread notifications
   - `PATCH /:id/read` - Mark notification as read
   - `PATCH /mark-all-read` - Mark all as read

7. **`routes/reports.js`** - Reporting (2 endpoints)
   - `GET /` - Daily report data
   - `POST /generate` - Generate PDF sales report

### Data Validation
- Uses `express-validator` library
- Request body validation with custom error messages
- Chaining validators for multiple fields
- Field normalization (email, phone)

## 2. Frontend Architecture

### Framework & Structure
- **Type**: Single Page Application (SPA) with vanilla JavaScript
- **UI Framework**: Bootstrap 5.3 with Bootstrap Icons
- **APIs**: Google Maps, custom API client
- **Build**: No build step - direct browser execution

### Core Frontend Files

#### `public/index.html`
- Main HTML entry point
- Navigation bar with role-based menu items
- App container for dynamic content
- Bootstrap & CSS includes
- Google Maps API integration

#### `public/js/app.js`
- Application initialization
- Authentication check on page load
- User context display
- Navigation visibility toggle based on role
- Admin-only navigation hiding

#### `public/js/api-client.js`
**ApiClient Class**:
- Centralized REST API communication
- Token management (localStorage)
- Base URL configuration
- Request/response handling with error catching
- Method namespacing: `apiClient.auth`, `apiClient.orders`, `apiClient.inventory`, etc.

**Endpoints grouped by domain**:
```
auth.login(), register(), setupStatus(), createUser(), logout()
orders.getAll(), getOne(), create(), update(), delete()
inventory.getAll(), getOne(), create(), update(), delete()
staff.getAll(), getOne(), create(), update(), delete()
dashboard.getStats(), getRecentOrders()
reports.getAll(), generate()
```

#### `public/js/router.js`
**Router Class**:
- Hash-based client-side routing
- Route registration with `register(path, component)`
- Component-based navigation
- Async component rendering
- Hash change listener
- Default fallback to `/dashboard`

#### Frontend Components (`public/js/components/`)
- `dashboard.js` - Stats cards, recent orders table
- `orders.js` - Order CRUD interface
- `inventory.js` - Product management
- `login.js` - Authentication form
- `maps.js` - Delivery route visualization
- `reports.js` - Admin reporting
- `staff.js` - Staff management

### Frontend Data Flow
1. User loads index.html
2. app.js initializes, checks auth status
3. If authenticated, shows nav + router.init()
4. Hash navigation triggers component render
5. Component calls apiClient methods
6. API responses update DOM with Bootstrap components

## 3. Database Design & Models

### Firebase Realtime Database Structure

#### Collection: `/users/{uid}`
```javascript
{
  uid: {
    email: string,
    displayName: string,
    phone: string,
    role: 'super_admin' | 'admin' | 'station_staff' | 'driver' | 'customer',
    status: 'active' | 'inactive' | 'suspended',
    fcmToken: string (optional),
    profilePicture: string (optional),
    createdBy: uid,
    createdAt: ISO8601,
    updatedAt: ISO8601,
    lastLogin: ISO8601 (optional),
    station: { stationId, position },
    vehicle: { licensePlate, vehicleType, capacity },
    customer: { businessName, address, creditLimit }
  }
}
```

#### Collection: `/orders/{orderId}`
```javascript
{
  orderId: {
    customerId: string,
    driverId: string (nullable),
    staffId: string,
    items: { itemId: { productId, productName, quantity, unitPrice, total } },
    status: 'pending' | 'confirmed' | 'processing' | 'ready' | 'in_transit' | 'delivered' | 'cancelled',
    totalAmount: number,
    payment: { method, status, transactionId },
    delivery: { address, estimatedTime, actualTime, notes },
    timeline: { timelineId: { status, timestamp, notes } },
    createdAt: ISO8601,
    updatedAt: ISO8601,
    scheduledFor: ISO8601
  }
}
```

#### Collection: `/inventory/{productId}`
```javascript
{
  productId: {
    name: string,
    description: string,
    category: string,
    pricing: { costPrice, sellingPrice, markup },
    stock: { current, reserved, available, reorderLevel, reorderQuantity },
    unit: 'piece' | 'liter' | 'box' | 'kg' | 'gallon',
    image: string (URL),
    barcode: string,
    supplier: { supplierId, supplierName, leadTime },
    status: 'active' | 'inactive' | 'discontinued',
    createdAt: ISO8601,
    updatedAt: ISO8601,
    lastRestocked: ISO8601,
    createdBy: uid
  }
}
```

#### Additional Collections
- `/deliveries/{deliveryId}`, `/payments/{paymentId}`, `/reports/{reportId}`, `/notifications/{userId}/{notificationId}`, `/auditLogs/{logId}`
- Hierarchical structures for tracking, payments, analytics, user notifications, and audit trails

## 4. Authentication & Authorization System

### Authentication Flow

1. **Initial Setup**
   - First user registers as super_admin via `/auth/register`
   - Endpoint checks if users count === 0
   - Creates Firebase Auth user + Realtime DB profile
   - Sets custom claims with role

2. **Login Process**
   - Frontend: `POST /api/auth/login` with email/password
   - Backend: Calls Firebase REST API `identitytoolkit.googleapis.com`
   - Returns `idToken` + user profile
   - Frontend stores token in localStorage
   - Subsequent requests include `Authorization: Bearer {idToken}`

3. **Token Verification**
   - Authentication middleware: `auth.verifyIdToken(token)`
   - Decodes JWT and extracts user context
   - Validates user status === 'active'
   - Adds to `req.user` object

### Authorization Model

**Roles (5 tiers)**:
1. **super_admin**: Full system access, can create users, manage all data
2. **admin**: Dashboard, reporting, staff management
3. **station_staff**: Order/inventory operations
4. **driver**: Delivery assignments
5. **customer**: Self-serve ordering

**Access Control Per Route**:
```
GET /orders - ALL authenticated users (customers see own, staff see all)
POST /orders - station_staff, admin, super_admin only
POST /inventory - station_staff, admin, super_admin only
POST /staff - super_admin only
GET /reports - admin, super_admin only
POST /reports/generate - admin, super_admin only
```

## 5. API Structure & Endpoints

### Request Format
- Content-Type: `application/json`
- Authentication: `Authorization: Bearer {idToken}`
- Response: JSON with status codes (200, 201, 400, 401, 403, 404, 500)

### Complete API Map

| Route | Method | Auth | Role | Purpose |
|-------|--------|------|------|---------|
| `/api/health` | GET | ✗ | - | Server health check |
| `/api/auth/setup-status` | GET | ✗ | - | Check if setup available |
| `/api/auth/login` | POST | ✗ | - | User authentication |
| `/api/auth/register` | POST | ✗ | - | Initial admin registration |
| `/api/auth/users` | POST | ✓ | super_admin | Create user by admin |
| `/api/auth/me` | GET | ✓ | any | Get current user profile |
| `/api/orders` | GET | ✓ | any | List orders |
| `/api/orders/:id` | GET | ✓ | any | Get order details |
| `/api/orders` | POST | ✓ | staff+ | Create order |
| `/api/orders/:id` | PUT | ✓ | staff+ | Update order |
| `/api/orders/:id` | DELETE | ✓ | staff+ | Cancel order |
| `/api/inventory` | GET | ✓ | any | List products |
| `/api/inventory/:id` | GET | ✓ | any | Get product |
| `/api/inventory` | POST | ✓ | staff+ | Add product |
| `/api/inventory/:id` | PUT | ✓ | staff+ | Update product |
| `/api/inventory/:id` | DELETE | ✓ | staff+ | Delete product |
| `/api/staff` | GET | ✓ | any | List staff |
| `/api/staff/:id` | GET | ✓ | any | Get staff member |
| `/api/staff` | POST | ✓ | super_admin | Add staff |
| `/api/staff/:id` | PUT | ✓ | super_admin | Update staff |
| `/api/staff/:id` | DELETE | ✓ | super_admin | Remove staff |
| `/api/dashboard/stats` | GET | ✓ | any | KPI dashboard |
| `/api/dashboard/recent-orders` | GET | ✓ | any | Recent 5 orders |
| `/api/notifications` | GET | ✓ | any | List notifications |
| `/api/notifications/unread-count` | GET | ✓ | any | Unread count |
| `/api/notifications/:id/read` | PATCH | ✓ | any | Mark as read |
| `/api/notifications/mark-all-read` | PATCH | ✓ | any | Mark all read |
| `/api/reports` | GET | ✓ | admin+ | Daily report data |
| `/api/reports/generate` | POST | ✓ | admin+ | Generate PDF |

## 6. Key Services & Utilities

### NotificationService `services/notificationService.js`

**Methods**:
- `sendEmail(to, templateName, data)` - Email via nodemailer
- `storeNotification(userId, notification)` - Save to DB
- `sendOrderConfirmation()` - Order email template
- `sendOrderStatusUpdate()` - Status change email

**Email Configuration**:
- SMTP host/port via env vars
- From address configurable
- Template substitution with data interpolation
- HTML email rendering

**Templates** `templates/emailTemplates.js`:
- `orderConfirmation` - New order confirmation
- `orderStatusUpdate` - Status change notification
- HTML templates with Bootstrap styling

### Inventory Transaction Pattern
`routes/orders.js` implements Firebase transactions:
```javascript
await database.ref(`inventory/${productId}`).transaction((current) => {
  const updatedQty = current.quantity - requiredQty;
  return updatedQty >= 0 ? updatedQty : undefined; // Atomic update or abort
});
```

## 7. Data Flow Architecture

### Order Creation Flow (End-to-End)
```
User Frontend
    ↓
renderOrderForm() → collect items + customer data
    ↓
apiClient.orders.create(orderData)
    ↓
POST /api/orders (authMiddleware → requireRole)
    ↓
Backend Validation (express-validator)
    ↓
Process Items:
  For each item:
    - Inventory transaction: deduct quantity
    - Check low stock → alert if below reorderLevel
    - Build order timeline
    ↓
Create order record in database
    ↓
Trigger notification service:
  - Store DB notification
  - Send email template
    ↓
Response JSON back to frontend
    ↓
Update order list UI
    ↓
Display success toast
```

### Authentication Data Flow
```
User login credentials
    ↓
Frontend: apiClient.auth.login(email, password)
    ↓
Backend: Firebase REST API identitytoolkit
    ↓
Firebase Auth Service
    ↓
Response: { idToken, localId, ... }
    ↓
Backend: Verify token with admin SDK
    ↓
Fetch user profile from Realtime DB
    ↓
Validate user status === 'active'
    ↓
Return: { idToken, user: { uid, email, role, displayName } }
    ↓
Frontend: localStorage.setItem('authToken')
    ↓
apiClient.setToken(idToken)
    ↓
All subsequent requests: Authorization: Bearer {idToken}
```

### Dashboard Stats Flow
```
apiClient.dashboard.getStats()
    ↓
GET /api/dashboard/stats
    ↓
Backend: Promise.all([
  database.ref('orders').once('value'),
  database.ref('staff').once('value'),
  database.ref('inventory').once('value')
])
    ↓
Aggregate/filter data:
  - Orders: sum revenue, count by status
  - Staff: count active vs total
  - Inventory: count products, sum value
    ↓
Return stats JSON
    ↓
Frontend: renderDashboard() updates card values
    ↓
User sees KPIs
```

## 8. Deployment & Configuration

### Environment Variables (.env)
```
PORT=5000
NODE_ENV=development
FIREBASE_PROJECT_ID=xxx
FIREBASE_PRIVATE_KEY=xxx
FIREBASE_CLIENT_EMAIL=xxx
FIREBASE_DATABASE_URL=xxx
FIREBASE_API_KEY=xxx
JWT_SECRET=xxx
CORS_ORIGIN=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=xxx
SMTP_PASS=xxx
SMTP_FROM=xxx
```

### Firebase Configuration Options
1. **File-based**: `firebase-key.json` in project root
2. **Environment vars**: `FIREBASE_*` in .env
3. **Fallback search**: Scans for `firebase-adminsdk*.json`

### Database Rules Deployment `database.rules.json`

**Security Rule Pattern**:
```javascript
"users/$uid": {
  ".read": "auth.uid == $uid || isAdmin()",
  ".write": "auth.uid == $uid || isAdmin()",
  ".validate": "newData.hasChildren(['email', 'displayName'])"
}
```

**Rule Enforcement**:
- Role-based read/write validation
- Data structure validation
- User isolation (customers see own data)
- Staff access to shared resources

**Deployment**:
- Firebase Console: Copy → Publish
- Firebase CLI: `firebase deploy --only database`

### Server Startup
```bash
# Development
npm run dev  # nodemon auto-reload

# Production
npm start    # node server.js
# Server runs on PORT (default 5000)
```

## 9. CORS & Security

### CORS Configuration
```javascript
Allowed Origins (Development):
  - http://localhost:3000
  - http://localhost:5000
  - https://yourdomain.com (production)

Credentials: true
Methods: GET, POST, PUT, DELETE (implied by express)
```

### Security Measures
- Firebase Auth tokens expire
- Role-based authorization on all API routes
- Data validation with express-validator
- Error details hidden in production
- Audit logging infrastructure (write-only for admins)
- HTTPS required for production deployment

## 10. Architectural Patterns Identified

### Design Patterns
1. **API Gateway Pattern**: Express server routes all requests
2. **Middleware Pipeline**: Auth → Validation → Handler → Error
3. **Repository Pattern**: Firebase database abstraction
4. **Service Layer**: NotificationService for business logic
5. **Component Pattern**: Frontend modular components
6. **SPA with Hash Routing**: Client-side navigation
7. **Transaction Pattern**: Inventory atomic operations
8. **Observer Pattern**: Role-based access control

### Development Practices
- Separation of concerns (routes, middleware, services)
- Dependency injection (database passed to functions)
- Error handling with custom AppError class
- Input validation at route level
- Environment configuration management
- Async/await for async operations

## 11. Scalability Considerations

**Current Architecture Strengths**:
- Firebase Realtime DB auto-scales
- Stateless Express servers (can be load-balanced)
- Role-based access reduces data exposure

**Current Limitations**:
- No caching layer (Redis)
- No API rate limiting
- Client-side routing limits SEO
- Firebase Realtime DB not ideal for complex queries

**Potential Improvements**:
- Add Redis for session/cache
- Implement API rate limiting (express-rate-limit)
- Add pagination to list endpoints
- Migrate to Firestore for better querying
- Add WebSockets for real-time notifications

## Key Insights

1. **Monolithic Backend**: Single Express server handles all business logic - suitable for small to medium deployments
2. **Role-Based Multi-Tenancy**: System supports different user types with different permissions
3. **Real-Time Readiness**: Firebase structure allows real-time updates with WebSocket listeners (currently using polling)
4. **Inventory Integrity**: Uses Firebase transactions to ensure stock accuracy during concurrent orders
5. **Email-Driven Notifications**: Nodemailer integration for order confirmations and status updates
6. **Admin Reporting**: PDF generation for daily/custom reporting
7. **No Build Step**: Frontend works directly in browser - good for rapid development, but missing optimizations

This comprehensive analysis reveals a **well-structured, feature-complete system** with clear separation of concerns, proper authentication/authorization, and scalable Firebase foundation. The system can handle multiple operational roles (admin, staff, drivers, customers) with appropriate data isolation and access control.