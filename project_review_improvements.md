# Water Station Management System - Project Review, Debugging Plan, and Fixing Plan

## Project Overview
This system uses an Express.js backend with Firebase Realtime Database and a Vanilla JavaScript SPA frontend. It also has a mobile direction (Room + Firebase) that must stay compatible with the shared data model.

Reference schema document:
- `FIRESTORE_MODELS.md`

---

## Current Architecture (Verified)
- **Backend**: Express.js (`server.js`) + route modules (`routes/*.js`)
- **Database**: Firebase Realtime Database via `admin.database()`
- **Auth**: Firebase Auth ID tokens verified in middleware (`middleware/authentication.js`)
- **Web Frontend**: `public/index.html` + `public/js/*`
- **Legacy/Unused Frontend Files**: additional `js/*` files exist, but the active web app loads scripts from `public/js/*`

---

## Whole-System Double Check (Against FIRESTORE_MODELS)

## 1) Alignment Summary

### Aligned Areas
- Realtime Database is the active DB and schema reference is now documented in `FIRESTORE_MODELS.md`.
- Root nodes used by system align with the updated model: `users`, `orders`, `inventory`, `staff`, `notifications`, `userSettings`, plus rules-defined nodes.
- Backend route coverage exists for auth, orders, inventory, staff, dashboard, reports, notifications.

### Partially Aligned Areas (High Risk)
1. **Orders payload mismatch between frontend and backend**
    - Backend expects: `customerId`, `items[*].unitPrice`, `items[*].total`, `totalAmount`.
    - Frontend currently sends different item fields and no `customerId`.
    - Impact: order creation can fail validation.

2. **Inventory schema mismatch between backend writes, frontend reads, and dashboard logic**
    - Backend inventory create/update uses nested `pricing.*` and `stock.*`.
    - Some frontend/dashboard code reads root `price` and `quantity`.
    - Orders stock transaction also reads root `quantity`.
    - Impact: stock decrement, low-stock logic, and dashboard inventory valuation can break or become inaccurate.

3. **Realtime rules vs runtime writes mismatch for inventory**
    - Rules validate inventory with required root fields (`price`, `quantity`, etc.).
    - Backend writes mostly nested structures.
    - Impact: writes may be rejected once strict rules are deployed/enforced.

4. **Reports frontend has contract and token issues**
    - Uses `apiClient.get('/api/reports')` although base URL already includes `/api`.
    - Uses `localStorage.getItem('token')` while the app stores `authToken`.
    - Report template rendering appears incomplete in current component output.
    - Impact: reports page and PDF generation can fail for authenticated users.

### Confirmed Technical Debt
- Login flow still depends on Firebase REST `signInWithPassword` + API key while backend middleware verifies Firebase ID tokens.
- Test script is still placeholder; no automated tests.
- No linting/format gates.
- No pagination for list endpoints; heavy reliance on `once('value')`.
- Google Maps API key is hardcoded in `public/index.html`.

---

## Updated Critical Issues (Prioritized)

## P0 - Must Fix Immediately
1. **Order create contract break (frontend ↔ backend).**
2. **Inventory canonical field mismatch (`price/quantity` vs `pricing/stock`).**
3. **Realtime rule compatibility with runtime writes.**
4. **Reports frontend endpoint + token bugs.**

## P1 - Important Stability and Security
1. **Auth flow standardization (remove mixed REST/Admin assumptions).**
2. **Secrets hygiene (remove hardcoded Maps API key).**
3. **Token/session lifecycle handling (expiry/refresh UX).**

## P2 - Quality, Performance, and Delivery Readiness
1. **Automated tests (API + contract + smoke).**
2. **Linting and code quality gates.**
3. **Pagination and query optimization.**
4. **Mobile app delivery track (customer/driver).**

---

## Debugging Plan (Whole System)

## Phase A - Environment and Baseline Verification
1. Validate environment variables:
    - `FIREBASE_DATABASE_URL`
    - `FIREBASE_API_KEY`
    - Firebase service account JSON presence
    - SMTP variables for notifications
2. Verify auth bootstrap flow:
    - `GET /api/auth/setup-status`
    - `POST /api/auth/login`
    - Protected call with returned ID token
3. Capture baseline request/response logs for all main routes.

## Phase B - Contract Debugging by Domain
1. **Orders**
    - Reproduce create order from UI and from API client/Postman.
    - Compare payload against route validators in `routes/orders.js`.
    - Confirm stock transaction path references current inventory shape.
2. **Inventory**
    - Create product from UI and inspect DB object shape.
    - Verify dashboard and orders transaction can read the same product fields.
    - Validate against deployed Realtime Database rules.
3. **Reports**
    - Test reports list and PDF generation using current frontend.
    - Verify API path composition and auth token key consistency.
4. **Notifications and user settings**
    - Verify creation, unread count, mark read, and settings update.
    - Confirm rules permit intended operations.

## Phase C - Security and Rule Validation
1. Run role matrix tests (`super_admin`, `admin`, `station_staff`, `driver`, `customer`) for read/write boundaries.
2. Validate every route write payload against `database.rules.json` required fields.
3. Confirm no public key leakage in frontend templates.

## Phase D - Regression Verification
1. Smoke test core web flows:
    - Login
    - Inventory CRUD
    - Order create/update/status
    - Dashboard stats/recent orders
    - Reports load/download
2. Verify mobile schema compatibility mappings still hold.

---

## Fixing Plan (Implementation Roadmap)

## Sprint 1 - Contract Stabilization (P0)
1. Define canonical runtime shape per node (orders and inventory first), using `FIRESTORE_MODELS.md` as source of truth.
2. Implement payload adapters where needed:
    - Frontend orders form -> backend order schema
    - Mobile Room order -> runtime order schema
3. Resolve inventory shape split:
    - Option A: canonical nested (`pricing`, `stock`) + mirrored root compatibility fields
    - Option B: canonical flat fields + remove nested usage
4. Update backend routes and frontend components to the same contract.
5. Align `database.rules.json` validations with final runtime shape.

## Sprint 2 - Auth and Reporting Hardening (P1)
1. Standardize login/session approach:
    - Keep Firebase ID token model
    - Remove inconsistent token keys and duplicate auth logic paths
2. Fix reports frontend:
    - Correct endpoint paths
    - Correct token key usage
    - Restore complete template bindings
3. Move Maps API key to environment/config injection.

## Sprint 3 - Testability and Safety Nets (P2)
1. Add automated tests:
    - Route validation tests
    - Contract tests for orders/inventory/reports
    - RBAC tests for protected endpoints
2. Add linting and formatting checks in CI.
3. Add basic health and smoke scripts for pre-deploy verification.

## Sprint 4 - Mobile Delivery Track
1. Build customer and driver mobile applications.
2. Implement repository-level mapping utilities between Room schema and runtime schema.
3. Add synchronization conflict handling and offline retry logic.

---

## Immediate Action Items (This Week)

1. Finalize canonical order payload and update both UI and backend validators.
2. Finalize canonical inventory payload and update:
    - `routes/inventory.js`
    - `routes/orders.js` stock transaction logic
    - dashboard inventory calculations
    - `database.rules.json`
3. Repair reports component API/token/path issues.
4. Add a focused manual test checklist for P0 flows.

---

## Debugging Checklist (Revised)

### Schema and Contracts
- [ ] Verify runtime payloads exactly match `FIRESTORE_MODELS.md`.
- [ ] Verify mobile-to-runtime field mapping is documented and tested.
- [ ] Verify inventory fields used by orders, dashboard, and rules are identical.

### Authentication and Authorization
- [ ] Verify ID token issuance and middleware verification path.
- [ ] Verify role checks in middleware and DB rules for each critical route.
- [ ] Verify token storage key consistency across frontend modules.

### Data and Rules
- [ ] Verify all write paths pass current rules validation.
- [ ] Verify notifications and user settings paths are writable/readable as intended.
- [ ] Verify no rules/path mismatch for optional nodes (deliveries/payments/auditLogs).

### Frontend Runtime
- [ ] Verify each route component uses API client paths correctly.
- [ ] Verify reports page renders complete values and downloads PDF successfully.
- [ ] Verify no hardcoded secrets in served HTML/JS.

### Quality and Release
- [ ] Add minimum API smoke tests.
- [ ] Add lint script and enforce in CI.
- [ ] Add rollback plan for schema/rule deployment.

---

## Definition of Done for Alignment Work

1. `FIRESTORE_MODELS.md` and actual runtime payloads match for all active nodes.
2. Web create/update flows pass validators and rules without schema workarounds.
3. Dashboard and reports compute metrics from the same canonical fields used in writes.
4. Mobile integration path is documented with explicit mapping and validated by tests.
5. P0 and P1 issues above are closed with evidence (test results + API samples).

---

## Conclusion

The project foundation is solid, but the top risk is contract drift between frontend, backend, and Realtime rules. This document now reflects the actual system state and provides a concrete debugging and fixing plan anchored to `FIRESTORE_MODELS.md`. The highest-value next step is to complete P0 contract stabilization before adding more features.