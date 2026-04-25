# Firebase Realtime Database Data Models

This document defines the Realtime Database structure across the whole system (mobile + Express/web backend).

## Database Structure Overview

The current system references the following root nodes:

```json
{
  "users": { ... },
  "orders": { ... },
  "inventory": { ... },
  "staff": { ... },
  "notifications": { ... },
  "userSettings": { ... },
  "reports": { ... },
  "deliveries": { ... },
  "payments": { ... },
  "auditLogs": { ... }
}
```

Notes:
- `users`, `orders`, and `inventory` are used by both mobile and web.
- `staff`, `notifications`, `userSettings`, and `reports` are actively used by the Express routes.
- `deliveries` is now exposed through the `/api/deliveries` runtime route as a derived view of `/orders` filtered by `assignedDriver`.
- `payments` and `auditLogs` are present in database rules and Firestore rules, but are not fully exposed via current Express CRUD routes.

---

## Mobile App Schema (Kept As-Is)

The mobile application uses Room database locally for orders, synced with Firebase Realtime Database.

### Orders Table (Room & Firebase)
This is the primary local database table defined in `H2GoDatabase.kt`.

| Field | Type | Description |
|-------|------|-------------|
| id (PK) | String | Unique Order ID |
| customerId | String | UID of the customer who placed the order |
| customerName | String | Name of the customer |
| driverId | String? | UID of the assigned driver (nullable) |
| product | String | Type of water/product ordered |
| quantity | String | Quantity ordered |
| address | String | Delivery address |
| price | String | Total price of the order |
| status | String | pending, assigned, in_transit, or delivered |
| timestamp | Long | Time the order was created |
| latitude | Double? | Latitude for GPS tracking |
| longitude | Double? | Longitude for GPS tracking |

### Users Schema (Firebase)
Stored in Firebase Realtime Database.

| Field | Type | Description |
|-------|------|-------------|
| uid | String | Firebase Auth UID |
| name | String | Full name of the user |
| email | String | User's email address |
| role | String | User role (e.g., customer, driver, admin) |
| phone | String | Contact number |
| address | String | Default delivery address |
| profilePictureUrl | String | Link to profile image |

### Inventory Schema (Firebase)
Used for managing available water products.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Product ID |
| name | String | Product name (e.g., "5 Gallon Slim") |
| price | Double | Unit price |
| stock | Int | Current available quantity |

### Database Classes
- **AppDatabase**: The Room database class (`h2go_database`).
- **OrderDao**: Handles local storage and synchronization of orders.
- **OrderRepository**: Manages data flow between Firebase and the local Room database.

---

## System Runtime Schema (Express/Web + Realtime DB)

### 1. users
**Path**: `/users/{uid}`

```javascript
{
  "{uid}": {
    email: string,
    displayName: string,
    phone: string,
    role: string,                     // 'super_admin' | 'admin' | 'station_staff' | 'driver' | 'customer'
    status: string,                   // 'active' | 'inactive' | 'suspended'
    createdAt: string,                // ISO 8601
    updatedAt: string,                // ISO 8601
    createdBy: string,                // Optional (when created by super_admin)
    tempPassword: boolean,            // True until the first verified password change
    otpVerified: boolean,             // True after the user confirms the verification code
    otpHash: string | null,           // Internal verification hash (not exposed to clients)
    otpExpiresAt: string | null,      // ISO 8601 expiry for the current verification code
    otpRequestedAt: string | null,    // ISO 8601 time the latest code was requested
    otpVerifiedAt: string | null,     // ISO 8601 time the code was last verified
    passwordChangedAt: string | null  // ISO 8601 time the password was last changed
  }
}
```

Mobile compatibility note:
- Mobile uses `name`; backend uses `displayName`.
- If mobile and web share the same user object, keep both fields in sync when possible.
- Account onboarding now also persists temporary-password and OTP verification metadata on the user profile.

---

### 2. orders
**Path**: `/orders/{orderId}`

```javascript
{
  "{orderId}": {
    customerId: string,
    customerName: string,
    customerPhone: string,
    customerAddress: string,

    items: [
      {
        productId: string,
        productName: string,
        quantity: number,
        unitPrice: number,
        total: number,
        price: number             // Compatibility field mirrored from unitPrice
      }
    ],

    totalAmount: number,
    status: string,                   // 'pending' | 'confirmed' | 'processing' | 'ready' | 'in_transit' | 'delivered' | 'cancelled'
    scheduledFor: string,             // Optional ISO 8601
    assignedDriver: string,           // Optional

    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string
  }
}
```

Mobile compatibility note:
- Mobile uses flat fields (`product`, `quantity`, `price`, `address`, `timestamp`, `latitude`, `longitude`) while web/backend uses `items[]`, `totalAmount`, and `customerAddress`.
- Keep transformation logic inside repository/sync layer when syncing to/from Room.

---

### 3. inventory
**Path**: `/inventory/{productId}`

```javascript
{
  "{productId}": {
    name: string,
    description: string,
    category: string,

    pricing: {
      costPrice: number,
      sellingPrice: number,
      markup: number
    },

    stock: {
      current: number,
      reserved: number,
      available: number,
      reorderLevel: number,
      reorderQuantity: number
    },

    // Compatibility fields used in some routes/components
    price: number,
    quantity: number,

    unit: string,
    image: string,
    barcode: string,
    supplier: {
      supplierId: string,
      supplierName: string,
      leadTime: number
    },
    status: string,
    createdAt: string,
    updatedAt: string,
    lastRestocked: string,
    createdBy: string,
    updatedBy: string
  }
}
```

Compatibility note:
- Some backend/web logic currently reads `price` and `quantity` at root.
- Newer inventory writes use `pricing.sellingPrice` and `stock.current`.
- Until code is unified, keep `price`/`quantity` mirrored with `pricing.sellingPrice`/`stock.current`.

---

### 4. staff
**Path**: `/staff/{staffId}`

```javascript
{
  "{staffId}": {
    uid: string,                    // Linked Firebase Auth UID
    name: string,
    email: string,
    phone: string,
    position: string,
    role: string,
    department: string,
    salary: number,
    hireDate: string,
    status: string,
    createdBy: string,
    createdAt: string,
    updatedBy: string,
    updatedAt: string
  }
}
```

Runtime note:
- Staff creation now also mirrors a corresponding profile under `/users/{uid}` and stores the Auth UID on the staff row for cross-reference.

---

### 5. notifications
**Path**: `/notifications/{uid}/{notificationId}`

```javascript
{
  "{uid}": {
    "{notificationId}": {
      type: string,                   // 'order' | 'delivery' | 'payment' | 'system' | 'inventory'
      title: string,
      message: string,
      data: object,
      read: boolean,
      readAt: string | null,
      createdAt: string,
      expiresAt: string
    }
  }
}
```

---

### 6. deliveries
**Path**: Derived runtime view backed by `/orders` and surfaced through `/api/deliveries`

```javascript
{
  // No separate write model yet; delivery rows are filtered order records
  // where `assignedDriver` matches the current driver session.
  orderId: string,
  customerId: string,
  customerName: string,
  customerPhone: string,
  customerAddress: string,
  items: array,
  totalAmount: number,
  status: string,                   // typically 'confirmed' | 'processing' | 'in_transit' | 'delivered' | 'cancelled'
  assignedDriver: string,
  createdAt: string,
  updatedAt: string
}
```

Runtime note:
- The driver-facing deliveries page is a filtered read model, not a separate collection write path.
- Delivery actions still update the backing `/orders/{orderId}` record.

---

### 7. userSettings
**Path**: `/userSettings/{uid}/notifications`

```javascript
{
  "{uid}": {
    notifications: {
      emailNotifications: boolean,
      pushNotifications: boolean,
      orderUpdates: boolean,
      deliveryUpdates: boolean,
      inventoryAlerts: boolean,
      systemNotifications: boolean
    }
  }
}
```

---

### 8. reports
**Path**: `/reports/{reportId}`

```javascript
{
  "{reportId}": {
    date: string,
    orders: array,
    totalOrders: number,
    totalSales: number,
    generatedBy: string,
    createdAt: string
  }
}
```

Note:
- Current `/api/reports` route primarily computes reports from `/orders` and `/staff` data on-demand.

---

### 9. Rules-Defined Nodes (Present in Security Rules)

The current rules file also defines access for:
- `/payments/{paymentId}`
- `/auditLogs/{logId}`

These are part of the wider architecture and can be treated as supported schema nodes, even if not fully surfaced in current Express CRUD routes.

---

## Security Rules Alignment

Source of truth for Realtime Database access control:
- `database.rules.json`

Current rule coverage includes:
- users
- orders
- inventory
- deliveries
- payments
- reports
- notifications
- userSettings
- auditLogs

---

## Querying Examples

### Get all orders for a customer
```
/orders?orderByChild=customerId&equalTo=userId123
```

### Get pending orders
```
/orders?orderByChild=status&equalTo=pending
```

### Get user profile
```
/users/userId123
```

### Get notifications for current user
```
/notifications/userId123
```

### Get inventory items
```
/inventory
```

---

## Final Notes

- The mobile schema section above is intentionally preserved.
- The runtime system currently uses additional web/backend fields that are now documented here.
- To avoid sync regressions, keep compatibility mappings in repository/service layers until all clients are migrated to one canonical shape.

