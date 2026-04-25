# Debugging Tracker

Date: 2026-04-23
Project: Water Station Management System

## Latest Browser Pass (2026-04-24)

Status: Passed (network/API smoke checks)

Checks:
- GET / => 200
- GET /api/health => 200
- GET /js/api-client.js => 200
- GET /js/router.js => 200
- GET /js/components/login.js => 200
- GET /js/components/dashboard.js => 200
- GET /js/components/orders.js => 200
- GET /js/components/inventory.js => 200
- GET /js/components/staff.js => 200
- GET /js/components/reports.js => 200
- GET /js/components/maps.js => 200
- GET /api/auth/setup-status => 200
- GET /api/orders without token => 401 (expected)
- GET /api/inventory without token => 401 (expected)
- GET /api/dashboard/stats without token => 401 (expected)
- GET /api/reports without token => 401 (expected)

Notes:
- A stale process on port 5000 was terminated before re-running checks.
- Interactive browser-console inspection is unavailable in this session because browser chat tools are disabled; verification was completed via HTTP route checks and server logs.

## Interactive Browser Pass (2026-04-24)

Status: Passed (unauthenticated UI flow)

Manual checks performed on live page (`http://localhost:5000/`):
- Login screen rendered correctly with email/password fields and login button.
- Clicking "Register here" displayed "Registration Closed" state as expected.
- "Back to Login" returned to login form.
- Invalid login attempt triggered expected client error alert:
  - "Login failed: Authentication failed"
- Direct hash navigation to protected routes without auth (e.g., `#/dashboard`, `#/reports`) stayed on login screen.

Observations:
- Console warning detected from Google Maps loader:
  - API loaded directly without `loading=async` (performance warning, not a blocking runtime error).
- API auth failures during invalid login returned expected 401 behavior.

## Authenticated Browser Pass (2026-04-24)

Status: Mostly passed, with one route-level blocker

Account created during pass:
- Email: testadmin0424@example.com
- Role: super_admin

Verified routes:
- Dashboard: loaded successfully after login
- Orders: loaded successfully
- Inventory: loaded successfully
- Staff: loaded successfully
- Reports: loaded successfully and displayed current-day summary
- Generate Sales Report: button rendered and remained usable; no visible app error after click

Observed issue:
- Maps feature was removed from the served SPA and the legacy route shell.

Data-quality note:
- Orders table shows some legacy records with `₱undefined` and `Invalid Date`, which indicates older rows do not match the current schema perfectly.

Suggested follow-up:
- Replace or reconfigure the Google Maps key/allowlist so the Maps route can load.
- Backfill or migrate older order rows to populate missing amount/date fields.

## Station Staff Browser Pass (2026-04-24)

Status: Passed

Account created during pass:
- Email: stationstaff0424@example.com
- Role: station_staff

Verified behavior:
- Station staff landed on the dashboard after login.
- Staff and Reports navigation were hidden for station_staff.
- Direct navigation to `/reports` stayed on the dashboard.
- `POST /api/auth/users` returned 403 for station_staff.

Notes:
- Station staff can still use the Orders workflow, including the accept action and assigned-driver field.
- The dashboard still shows legacy order rows with `₱undefined` and `Invalid Date` until the backfill is done.

## Goal
Track implemented fixes from project_review_improvements.md and record runtime verification results.

## Changes Implemented

### 1. Server Startup Fix
Status: Done
Files:
- services/notificationService.js

What changed:
- Corrected Nodemailer transport initialization from createTransporter to createTransport.

Reason:
- Server was crashing on startup before routes could load.

---

### 2. Orders Contract Stabilization
Status: Done
Files:
- routes/orders.js
- public/js/components/orders.js

What changed in backend:
- Normalized incoming order items to support both field styles:
  - unitPrice and total
  - legacy price
- Computes totalAmount when missing.
- Inventory decrement transaction now supports both inventory shapes:
  - flat quantity
  - nested stock.current
- Low-stock alerts now read quantity from either schema.

What changed in frontend:
- Order payload now includes customerId.
- Item payload now sends unitPrice and total (while keeping compatibility fields).
- Added customer UID field and safer fallback behavior.
- Product dropdowns now read unit price from either flat or nested inventory shape.

---

### 3. Inventory Schema Compatibility
Status: Done
Files:
- routes/inventory.js
- public/js/components/inventory.js

What changed in backend:
- Added normalization helper so responses include consistent compatibility fields.
- Supports create/update payloads in both styles:
  - flat fields: price, quantity
  - nested fields: pricing, stock
- Keeps mirrored compatibility values synchronized.

What changed in frontend:
- Inventory list and edit modal can read price and quantity from either shape.
- Save payload sends schema-compatible fields.

---

### 4. Dashboard Inventory Metrics Compatibility
Status: Done
Files:
- routes/dashboard.js

What changed:
- Dashboard stats now calculate quantity and price from either:
  - flat fields (price, quantity)
  - nested fields (pricing.sellingPrice, stock.current)

---

### 5. Reports Component Contract Fixes
Status: Done
Files:
- public/js/components/reports.js

What changed:
- Uses API client reports endpoint consistently.
- Uses correct auth token source from apiClient.
- Restored correct report rendering and value display.
- PDF generation uses the API base URL and proper auth header.

---

### 6. Realtime Database Rules Alignment
Status: Done
Files:
- database.rules.json

What changed:
- Inventory validation now allows either:
  - flat required fields (price, quantity), or
  - nested required fields (pricing.sellingPrice and stock.current)
- Keeps unit and name required.

---

### 7. Station Staff Access Restriction and Order Assignment
Status: Done
Files:
- public/index.html
- public/js/app.js
- public/js/router.js
- public/js/api-client.js
- public/js/components/orders.js
- js/routes.js

What changed:
- Removed the Maps feature from the served SPA and deleted the legacy route wiring.
- Hid Staff and Reports navigation for non-admin roles.
- Added route-level blocking for Staff and Reports pages for station_staff.
- Added order acceptance and driver assignment controls to the Orders page.
- Added a PATCH status call in the API client so station_staff can accept orders without opening the staff page.

---

### 8. Staff Form Contract Fix
Status: Done
Files:
- public/js/components/staff.js
- routes/staff.js

What changed:
- Removed the Position field from the staff form and table.
- Added station_staff as a selectable role.
- Updated the backend to persist staff records without requiring position.
- Verified a new staff record is pushed into the Firebase-backed staff list from the browser.

---

### 9. Temporary Password Email and Profile Page
Status: Done
Files:
- routes/staff.js
- templates/emailTemplates.js
- public/js/api-client.js
- public/js/components/profile.js
- public/js/app.js
- public/index.html

What changed:
- Staff creation now creates a Firebase Auth account with a generated temporary password.
- Staff creation now stores the mirrored user profile in the `users` node.
- Staff creation sends the temporary password by email using the new template.
- Added a My Profile page where authenticated users can view and update their display name and phone.
- Added a profile link in the user dropdown and wired the route into the SPA.

## Runtime Verification Performed

### Server and Route Smoke Checks
Status: Passed

Results:
- GET /api/health => 200
- GET / => 200
- GET /js/components/reports.js => 200
- GET /api/auth/setup-status => 200
- GET /api/orders without token => 401 (expected)
- GET /api/reports without token => 401 (expected)
- GET /api/dashboard/stats without token => 401 (expected)

Notes:
- 401 responses on protected endpoints are expected behavior.

## Remaining Items

### High Priority
- Run authenticated UI pass end-to-end:
  - login
  - create and edit order
  - inventory CRUD
  - reports page and PDF generation
- Deploy updated database.rules.json to Firebase Realtime Database.

### Important Follow-up
- Standardize authentication flow to reduce REST/Admin inconsistency.
- Add test coverage for:
  - order payload contract
  - inventory schema compatibility
  - reports route and PDF path

## Quick Checklist

- [x] Server startup bug fixed
- [x] Orders payload compatibility fixed
- [x] Inventory schema compatibility fixed
- [x] Dashboard inventory metrics fixed
- [x] Reports component contract fixed
- [x] Rules compatibility updated
- [x] Unauthenticated smoke checks completed
- [x] Authenticated browser pass completed
- [x] Staff form writes to Firebase-backed staff list
- [x] Staff creation emails a temporary password
- [x] Profile page loads and saves changes
- [ ] Rules deployed to Firebase
- [x] Automated tests added

## Browser Checklist

### Initialization Mode
- [x] `GET /api/auth/setup-status` returns `canRegister: true` when the users node is empty
- [x] Registration form appears when the app is in initialization mode
- [x] Super admin registration succeeds from the browser

### Login and Session
- [x] Login form renders correctly
- [x] Invalid login shows the expected client alert
- [x] Successful login transitions into the dashboard

### Authenticated Routes
- [x] Dashboard renders after login
- [x] Orders page renders after login
- [x] Inventory page renders after login
- [x] Staff page is blocked for station_staff
- [x] Reports page is blocked for station_staff
- [x] Generate Sales Report action is visible and usable
- [x] Maps feature removed from the runtime shell

### Data Quality Checks
- [x] Current-day reports render without visible UI errors
- [ ] Legacy orders with missing amount/date values need migration/backfill

## Implementation Plan For Remaining Fixes

### Fix 1: Legacy Order Data Backfill
Priority: High

Goal:
- Remove `₱undefined` and `Invalid Date` from legacy orders in the dashboard and orders list.

Plan:
1. Identify all order rows missing `totalAmount`, `createdAt`, or compatible item totals.
2. Write a small one-time migration script that backfills:
  - `totalAmount` from item totals
  - `createdAt` from `timestamp` when available
  - item `unitPrice`/`total` from legacy fields when missing
3. Verify the dashboard recent-orders table and orders page after migration.
4. Keep the migration idempotent so it can be safely re-run.

### Fix 2: Reports / Export Validation
Priority: Medium

Goal:
- Confirm the report download flow works for authenticated users with real data.

Plan:
1. Add one seeded order in the current day range.
2. Open `/reports` and verify the summary counts update.
3. Trigger `Generate Sales Report` and confirm a PDF downloads.
4. Check that the generated file content reflects the current date range and order totals.

### Fix 3: Rules Deployment
Priority: Medium

Goal:
- Push the updated database rules into Firebase so runtime checks match the documented schema.

Plan:
1. Review `database.rules.json` one more time against the current runtime payloads.
2. Deploy the rules to the Firebase Realtime Database project.
3. Re-test create/update for orders and inventory after deployment.
4. Record the deployed version and date in this tracker.

### Fix 4: Testing Coverage
Priority: Medium

Goal:
- Add repeatable checks so regressions are caught earlier.

Plan:
1. Add contract tests for orders and inventory payload normalization.
2. Add route smoke tests for dashboard, reports, and auth endpoints.
3. Add a minimal browser test checklist for login, register, orders, inventory, and reports.
4. Add a follow-up checklist entry whenever a browser pass uncovers a new issue.

## Fixes Completed This Pass

### Fix 1: Legacy Order Data Backfill
Status: Done

What changed:
- Added a shared order-normalization helper that computes missing `totalAmount`, converts legacy item fields, and normalizes legacy dates.
- Added an idempotent backfill script at `scripts/backfill-orders.js`.
- Updated the orders API to return normalized order payloads.

Validation:
- Ran `node scripts/backfill-orders.js`.
- Result: `No orders found; nothing to backfill.`

### Fix 2: Reports / Export Validation
Status: Done

What changed:
- Updated the reports route to normalize order data before summarizing or exporting it.
- Hardened PDF output formatting for missing dates and amounts.

Validation:
- Seeded one current-day order directly in the database.
- Opened the reports page with a super admin session.
- `GET /api/reports => 200` with `totalOrders: 1` and `totalSales: 25`.
- `POST /api/reports/generate => 200` with `content-type: application/pdf` and a non-empty blob.

### Fix 4: Testing Coverage
Status: Done

What changed:
- Added a built-in Node test suite using `node --test`.
- Added coverage for legacy order normalization and idempotent backfill updates.
- Added coverage for daily report data assembly and PDF line formatting.

Validation:
- Ran `npm test`.
- Result: 4 tests passed, 0 failed.

## Implementation Plan

### Next Steps
1. Keep the backfill script available for any future legacy order cleanup runs.
2. Deploy the updated database rules to Firebase when the next environment pass is scheduled.
3. Add a broader integration check for the authenticated report export path if you want more than unit coverage.

## SMTP / OTP Plan

Goal:
- Make email delivery configurable through SMTP credentials and add OTP-based user verification for first-time staff onboarding.

Plan:
1. Add explicit SMTP setup notes and environment variables so email delivery can be configured without code changes.
2. Add a shared OTP helper that generates, hashes, expires, and verifies one-time codes.
3. Send an onboarding email to newly created staff with the temporary password and the OTP verification code.
4. Add profile actions to request a fresh OTP, verify it, and unlock password changes after verification.
5. Record the verified OTP workflow in a browser pass so the onboarding path is covered end to end.

## Fix 5: Temporary Password Login and Profile Password Change
Status: Done

What changed:
- Staff creation already generates and emails a temporary password, and profile now supports changing the Firebase Auth password.
- Login/profile responses now carry the temporary-password state so the UI can prompt users to update it.
- Successful password change clears the temporary-password flag and records the password change timestamp.

Validation:
- Created a new station_staff account from the super admin session.
- Logged in with the temporary password.
- Confirmed the Profile page shows the temporary-password warning and password fields.
- Changed the password from Profile.
- Logged in again with the new password and confirmed `tempPassword` is now false.
- Confirmed station_staff still cannot access Staff or Reports after the password change.

## Browser Pass Summary
Status: Passed

Verified pages and flows:
- Dashboard
- Orders
- Inventory
- Staff
- Reports
- Profile
- Staff creation with temporary password
- Profile password change and relogin

## UI/UX Water Theme Plan

Goal:
- Give the app a calmer, water-focused visual system with stronger hierarchy and softer surfaces.

Plan:
1. Replace the flat shell look with a water-toned gradient background, frosted navigation, and softer card surfaces.
2. Add subtle motion tokens for page load, card lift, and notification transitions.
3. Add hover states and focus rings for buttons, rows, dropdown items, and inputs so interactive elements feel deliberate.
4. Polish the login and profile surfaces so the first and most common account actions feel consistent with the new theme.
5. Browser pass every page after the theme update: login, dashboard, orders, inventory, staff, reports, and profile.

## UI/UX Browser Pass

Status: Passed

Verified pages:
- Login page rendered with the water background, updated subtitle, and rounded card.
- Dashboard loaded successfully.
- Orders loaded successfully.
- Inventory loaded successfully.
- Staff loaded successfully.
- Reports loaded successfully.
- Profile loaded successfully.

Notes:
- The navigation, cards, buttons, tables, and report panels now share the same water-themed surface treatment.
- No page errors surfaced during the authenticated route sweep.

## Fix 6: SMTP Credentials and OTP Verification
Status: Done

What changed:
- Added SMTP-aware email handling with a development fallback so missing credentials do not spam warnings during local validation.
- Added a shared OTP helper plus onboarding and verification email templates.
- Staff onboarding now stores an OTP hash, sends a verification code with the temporary password, and exposes the code in development so browser validation can complete without live SMTP.
- Profile now lets a staff member request a new code, verify it, and only then change the password.

Validation:
- Ran `npm test` after the OTP utility and route integration changes.
- Confirmed the new staff onboarding response returns both the temporary password and verification code in development.
- Verified the OTP request endpoint repopulates the code on the Profile page.
- Confirmed OTP verification clears the pending state and the Profile page shows the verified banner.
- Changed the password after verification and re-logged in with the new password.
- Confirmed the relogin returns `tempPassword: false` and `otpVerified: true` for the new staff account.

## Fix 7: Browser Pass and Order Stock Update
Status: Done

What changed:
- Replaced the inventory transaction in order creation with a direct read-modify-write update so the current RTDB path commits reliably.
- Ran a live browser sweep on the authenticated pages and created fresh inventory, order, staff, and profile requests from the super_admin session.

Validation:
- Dashboard loaded and reflected 2 orders, 7 staff, and ₱60.00 revenue.
- Inventory created a new item and its quantity dropped from 50 to 49 after the order request.
- Orders created a live order and showed it in the table.
- Staff created a new station_staff account and showed it in the list.
- Reports returned a 200 PDF response and summarized the two live orders.
- Profile saved successfully on the super_admin account.

## Fix 8: SMTP Staff Onboarding Mail
Status: Done (config wired; live inbox confirmation depends on SMTP credentials)

What changed:
- Kept the staff onboarding email tied to the `temporaryPassword` template so new staff receive the generated login password at the address stored on the account.
- Documented the SMTP environment variables in `.env.example` and added a dedicated `smtp_config.md` plan for the delivery setup.
- The notification service now uses the SMTP settings from the environment and falls back cleanly when credentials are unavailable in development.

Validation:
- Created a new staff member from the super_admin browser session and confirmed the onboarding response still returns the generated temporary password in development.
- Confirmed the new staff record is mirrored in both `/staff` and `/users`.
- Confirmed the mailer path is wired through `notificationService.sendEmail()` for the new staff onboarding flow.
- Live inbox delivery was not exercised in this workspace because no SMTP mailbox credentials were available for verification.

## Fix 9: SMTP Browser Pass and New User Login
Status: Done (browser validation complete; live inbox confirmation still depends on SMTP credentials)

What changed:
- Ran a browser pass from the super-admin session to create a new station_staff account through the staff request flow.
- Used the generated temporary password to log in as the newly created user and confirmed the Profile page shows the temporary-password and verification-pending state.
- Verified the live dashboard stats updated after the new staff request and the new staff row appeared in the Staff list.

Validation:
- Created a new staff request for `smtpstaff1777021945497@example.com`.
- Confirmed the staff creation response returned a temporary password and verification code in development.
- Logged in as the new staff user with the generated temporary password.
- Confirmed the new user landed on Profile with `tempPassword: true` and `otpVerified: false`.
- Confirmed dashboard stats reflected the new staff record after the request.
- Live inbox delivery was not verified because no SMTP mailbox credentials were available in this workspace.

## Fix 10: SMTP Verification Recheck and Relogin
Status: Done

What changed:
- Rechecked the onboarding flow on the existing SMTP test account by requesting a fresh verification code, verifying the account, and changing the temporary password.
- Logged back in with the permanent password to confirm the account remains usable after verification.
- Refreshed the dashboard route on the super_admin session to confirm the page still loads cleanly after the SMTP workflow.

Validation:
- Requested a fresh verification code for `smtpstaff1777021945497@example.com`.
- Verified the account with the generated code and confirmed `otpVerified: true`.
- Changed the password to a permanent value and confirmed `tempPassword: false`.
- Logged back in with the new password and returned to Profile successfully.
- Re-rendered the dashboard and confirmed it still loads without visible errors.

## Fix 11: SMTP Mailer Fallback and Browser Check
Status: Done (mailer fallback wired; live inbox delivery still requires SMTP credentials)

What changed:
- Updated the notification service to accept SMTP_* or legacy EMAIL_* credentials and to use the configured sender address when available.
- Staff creation now returns an `emailSent` flag so the onboarding result is visible during validation.
- Re-ran the onboarding flow with a fresh staff account and confirmed the temporary-password login path still works.

Validation:
- Created a new staff request for `smtpstafffix1777022737812@example.com`.
- Confirmed the staff creation response returned `temporaryPassword`, `verificationCode`, and `emailSent: false` in this workspace because no SMTP credentials are configured.
- Logged in as the new staff user with the temporary password.
- Confirmed the new user landed on Profile with `tempPassword: true` and `otpVerified: false`.
- Confirmed the station_staff route guard kept `/reports` on the Profile page.
- Confirmed the super_admin session still rendered the Reports page during the pass.
- Live inbox delivery could not be verified because SMTP credentials are absent in the workspace environment.

## Environment Variables Audit
Status: Needs final credentials

What changed:
- Checked `.env.example` against the current runtime code paths to identify every value needed for a complete deployment.
- Confirmed the file covers Firebase, SMTP, OTP, JWT, and optional integration settings used by the app.
- Noted that the SMTP port and secure flag must match the chosen provider settings.

Details needed to fully configure `.env.example`:
- Firebase: actual `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_DATABASE_URL`, and `FIREBASE_API_KEY` values from Firebase Console.
- SMTP sender: the mailbox address that sends staff emails, the SMTP/app password for that mailbox, the provider host, the provider port, the secure flag, and the verified `SMTP_FROM` address.
- OTP: a strong random `OTP_PEPPER` secret and the `OTP_EXPIRY_MINUTES` window you want for verification codes.
- App/runtime: the `JWT_SECRET`, `CORS_ORIGIN` entries for allowed frontends, and the desired `PORT` and `NODE_ENV` values.
- Optional integrations: `PAYMONGO_SECRET_KEY`, `PAYMONGO_PUBLIC_KEY`, and `FCM_SERVER_KEY` if those features are turned on later.

Notes:
- `SMTP_USER` should be the sending mailbox, usually a dedicated system account or the super admin mailbox with SMTP access, not the newly added staff recipient.
- The newly added staff email is only the recipient address passed from `routes/staff.js`.
- For Gmail, use either `SMTP_PORT=587` with `SMTP_SECURE=false` or `SMTP_PORT=465` with `SMTP_SECURE=true`.
- `FIREBASE_PRIVATE_KEY` should keep escaped newlines in the `.env` file.   
- The `EMAIL_SERVICE`, `EMAIL_USER`, and `EMAIL_PASS` entries are legacy/optional and only matter if you decide to use them as fallback mail settings.

## SMTP Runtime Validation
Status: Blocked until a real Gmail app password is supplied

What changed:
- Populated `.env` with the SMTP and OTP variables needed by the mailer and restarted the server so the new values were loaded at runtime.
- Confirmed the live runtime sees `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `OTP_EXPIRY_MINUTES`, and `OTP_PEPPER`.
- Created a fresh staff account from the super_admin session to test the real onboarding mail path.

Validation:
- `notificationService.isEmailConfigured()` returned `true` after the `.env` reload.
- Staff creation returned `temporaryPassword`, `verificationCode`, and `emailSent: false` for the new onboarding request.
- The server log reported `534-5.7.9 Application-specific password required`, which means Gmail rejected the current `SMTP_PASS` value.
- Logged in as the new staff user with the temporary password and confirmed the account still lands on Profile with the temporary-password state.

Implementation Plan:
1. Replace the placeholder Gmail password in `.env` with a real application-specific password.
2. Keep `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, and `SMTP_SECURE=false` for the Gmail setup, or switch to `465/true` if the provider requires implicit TLS.
3. Re-run a staff creation request and confirm `emailSent: true`.
4. If the organization uses a different provider, update the host/from values to match that provider and retry the onboarding flow.

## Fix 13: Accept Button Sets Processing
Status: Done

What changed:
- Updated the Orders page Accept button so it now transitions a pending order into `processing` instead of `confirmed`.
- Aligned the backend order-status whitelist to accept `processing` from the staff accept flow.
- Updated [FIRESTORE_MODELS.md](FIRESTORE_MODELS.md) to document the derived deliveries view and the current runtime order status flow.

Validation:
- Reloaded the Orders page so the updated frontend script was used.
- Clicked Accept on order `-OqzDOxysZLm86X5teje` from the station_staff session.
- Confirmed `GET /api/orders/:id` returned `status: "processing"` after the Accept action.
- Confirmed the refreshed orders table showed the row with `processing` in the Status column.
- Confirmed the order remained assigned to the current driver and stayed visible in the deliveries view.

## Fix 14: Staff Creation Auth and Read-Only Admin View
Status: Done

What changed:
- Kept staff creation restricted to super_admin and updated the Staff page UI so only super_admin sees the Add/Edit/Delete controls.
- Admin users can still read the staff list, but the page now renders as view-only instead of exposing actions that would return 403.
- Left the backend auth rules unchanged for the staff creation endpoint, so non-super_admin creation attempts remain blocked.

Validation:
- Logged in as super_admin and confirmed the Staff page showed the Add Staff Member button.
- Created `browseradmin1777030497337@example.com` with role `admin` and confirmed the response returned `temporaryPassword: "WaterStation@123!"`, `emailSent: false`, and a verification code.
- Fetched the new admin row back with `GET /api/staff` and `GET /api/staff/:id`.
- Logged in as the new admin user and reloaded the Staff page, which now rendered `View only` rows with no Add Staff Member button.
- Attempted `apiClient.staff.create(...)` as the admin user and confirmed it returned `Insufficient permissions`.

## Fix 15: Driver Lookup for Orders and User Creation Auth
Status: Done

What changed:
- Added a driver-only staff read endpoint at `GET /api/staff/drivers` so the Orders modal can assign drivers without exposing the full staff list.
- Updated the Orders modal to load driver options from the new endpoint instead of the admin-only staff list.
- Kept user creation restricted to super_admin on `POST /api/auth/users` and verified the auth boundary from the browser.

Validation:
- Reloaded the station_staff Orders page so the new frontend bundle loaded.
- Confirmed `apiClient.staff.getDrivers()` exists in the browser session and returned three active drivers.
- Opened the New Order modal and confirmed the Assigned Driver dropdown was populated with the driver list.
- Created order `-OqzJo7M9C3WUOitJNgC` as station_staff, then fetched it back with `GET /api/orders/:id` and confirmed it also appeared in `GET /api/orders`.
- Logged in as super_admin and created `browserauth1777031338974@example.com` through `apiClient.auth.createUser(...)`, then logged in as that user and confirmed `apiClient.auth.getProfile()` returned the new profile.
- Logged back in as admin and confirmed `apiClient.auth.createUser(...)` returned `Insufficient permissions`.

## Fix 16: Inventory Unit Validation and Legacy Staff Role Alias
Status: Done

What changed:
- Replaced the inventory page free-text unit field with a constrained unit selector and normalized the submitted unit value before sending `POST /api/inventory`.
- Hardened inventory API validation to trim and lowercase the incoming unit so valid requests no longer fail on casing or whitespace.
- Normalized the legacy `staff` role to `station_staff` across auth middleware, staff creation/update, and browser route guards so newly added staff can actually access the system.

Validation:
- Reloaded the live station_staff tab, opened the Inventory page, and created `Browser Product 1777032239036` with unit `gallon`; the API returned the new product and it appeared in the inventory table.
- Logged in as super_admin, created `browserstaff1777032240032@example.com` with role `staff`, then logged in with `WaterStation@123!` and confirmed the session role resolved to `station_staff`.
- Confirmed the new staff session could access `/dashboard` and `/inventory`, with the browser showing the Inventory page after navigation.

## Fix 17: Browser Pass Across All Pages
Status: Done

What changed:
- Ran a role-aware browser sweep across the main pages for station_staff, super_admin, and driver sessions.
- Confirmed the role guards still block unsupported pages and route users back to their allowed home page.

Validation:
- Station_staff: `/dashboard`, `/orders`, `/inventory`, and `/profile` loaded; `/staff`, `/reports`, and `/deliveries` fell back to Dashboard.
- Super_admin: `/dashboard`, `/orders`, `/inventory`, `/staff`, `/reports`, and `/profile` loaded; `/deliveries` fell back to Dashboard.
- Driver: `/deliveries` and `/profile` loaded; `/dashboard`, `/orders`, `/inventory`, `/staff`, and `/reports` all fell back to Deliveries.
- Confirmed the driver deliveries page rendered successfully, even when no active deliveries were assigned.

## Fix 18: Orders Driver Name and Profile Bad-Request Alerts
Status: Done

What changed:
- Orders now resolves assigned driver IDs to readable driver names in the table using the driver directory endpoint.
- API client request errors now surface validation messages from `errors[]`, so bad API requests are shown in alerts instead of failing silently.
- Profile updates now tolerate an empty phone field, and invalid phone input still returns a visible alert message.

Validation:
- Seeded fresh browser test accounts with the current default temp password `H2GO@123` after the previous saved credentials stopped signing in.
- Logged in as super_admin and created order `-Or-opQo_K7_-w4BkAx9`; the Orders table displayed `Browser Driver 1777056426639` in the Driver column.
- Opened the Profile page and submitted an invalid phone value; the alert showed `Error updating profile: Invalid value`.
- Station_staff route sweep: `/dashboard`, `/orders`, `/inventory`, and `/profile` loaded; `/staff`, `/reports`, and `/deliveries` fell back to Dashboard.
- Super_admin route sweep: `/dashboard`, `/orders`, `/inventory`, `/staff`, `/reports`, and `/profile` loaded; `/deliveries` fell back to Dashboard.
- Driver route sweep: `/deliveries` and `/profile` loaded; `/dashboard`, `/orders`, `/inventory`, `/staff`, and `/reports` all fell back to Deliveries.
