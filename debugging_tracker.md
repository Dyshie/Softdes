# Debugging Tracker

Date: 2026-04-24
Project: Water Station Management System

## Latest Browser Pass (2026-04-24)

Status: Passed

Checked pages:
- Dashboard loaded successfully.
- Orders loaded successfully.
- Inventory loaded successfully and showed the expected data row.
- Staff redirected back to the dashboard for the current station_staff session.
- Reports redirected back to the dashboard for the current station_staff session.
- My Profile loaded successfully.

Checked requests:
- GET /api/auth/setup-status => 200
- GET /api/dashboard/stats => 200
- GET /api/dashboard/recent-orders => 200
- GET /api/orders => 200
- GET /api/inventory => 200
- GET /api/staff => 200
- GET /api/reports => 403 for station_staff

Observed errors:
- GET /api/reports returned `Insufficient permissions` for station_staff, which matches the current access rules and is expected.

Notes:
- The earlier inventory token failure was not reproduced in this pass.
- The UI shell was refreshed to remove icons and the logo mark, and the app now uses a cleaner visual system.

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

## SMTP Runtime Validation
Status: Superseded for staff onboarding

What changed:
- Populated `.env` with the SMTP and OTP variables needed by the mailer and restarted the server so the new values were loaded at runtime.
- Confirmed the live runtime sees `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `OTP_EXPIRY_MINUTES`, and `OTP_PEPPER`.
- Created a fresh staff account from the super_admin session to test the real onboarding mail path.

Validation:
- `notificationService.isEmailConfigured()` returned `true` after the `.env` reload.
- Staff creation returned `temporaryPassword`, `verificationCode`, and `emailSent: false` for the new onboarding request.
- The server log reported `534-5.7.9 Application-specific password required`, which means Gmail rejected the current `SMTP_PASS` value.
- Logged in as the new staff user with the temporary password and confirmed the account still lands on Profile with the temporary-password state.

Note:
- Staff onboarding no longer depends on SMTP delivery, so the Gmail auth failure does not block the ability for newly added staff to log in.

Implementation Plan:
1. Replace the placeholder Gmail password in `.env` with a real application-specific password.
2. Keep `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, and `SMTP_SECURE=false` for the Gmail setup, or switch to `465/true` if the provider requires implicit TLS.
3. Re-run a staff creation request and confirm `emailSent: true`.
4. If the organization uses a different provider, update the host/from values to match that provider and retry the onboarding flow.

## Fix 11: Remove SMTP From Staff Onboarding and Lock Role Views
Status: Done

What changed:
- Removed the SMTP send step from the staff-create flow so newly added staff are not blocked by Gmail auth failures.
- Kept the shared temporary password flow and exposed `temporaryPassword: "WaterStation@123!"` directly from staff creation.
- Added a driver-only deliveries route and page, then tightened route guards and nav visibility so station_staff only sees dashboard/orders/inventory/profile and driver only sees deliveries/profile.
- Enforced the same role boundaries on the backend so the SPA cannot bypass the UI restrictions with direct API calls.

Validation:
- Created a fresh `station_staff` account and confirmed the create response returned `temporaryPassword: "WaterStation@123!"`, `emailSent: false`, and a verification code.
- Created a fresh `driver` account and a delivery assigned to that driver.
- Logged in as station_staff and confirmed only Dashboard, Orders, and Inventory were visible; `/staff`, `/reports`, and `/deliveries` redirected back to Dashboard.
- Logged in as driver and confirmed only Deliveries was visible; `/dashboard`, `/orders`, `/inventory`, `/staff`, and `/reports` all redirected to Deliveries.
- Confirmed the driver deliveries page rendered the assigned delivery and exposed the delivery status action.

## Standard Temporary Password
Status: Done

What changed:
- Replaced the random temporary-password generator with a shared standard temporary password loaded from `DEFAULT_TEMP_PASSWORD`.
- Added the standard temporary password to `.env` and `.env.example` so the onboarding flow and documentation use the same value.
- Staff creation still sends the onboarding email payload, but the temporary password value is now predictable and consistent for all new staff.

Validation:
- Created a new `station_staff` request for `standardtemp1777025069453@example.com` from the super_admin session.
- Confirmed the create response returned `temporaryPassword: "WaterStation@123!"`, `emailSent: false`, and a mirrored staff record in `/staff`.
- Fetched the created row back with `GET /api/staff` and `GET /api/staff/:id`, which returned the new staff record and the expected list count of 11.
- Logged in as the new staff user with `WaterStation@123!` and confirmed `/auth/me` returned `tempPassword: true` and `otpVerified: false`.
- Confirmed the browser session landed on `#/dashboard` after login, proving the auth flow accepts the standard temporary password.

## Fix 12: Browser Pass and Order/Auth Validation
Status: Done

What changed:
- Ran a fresh browser pass against the current station_staff and driver sessions.
- Created a new order from the station_staff session and verified it was stored with the assigned driver.
- Verified the fetch path by reading the order back with both `GET /api/orders` and `GET /api/orders/:id`.
- Checked auth boundaries by confirming station_staff gets `403 Insufficient permissions` on the staff API and driver gets `403 Insufficient permissions` on the orders API.

Validation:
- Created order `-OqzBJv7Fm5smM67SKP7` from the station_staff session with `Browser Order 1777029177383` and assigned it to the current driver.
- Confirmed `GET /api/orders` returned 5 orders and `GET /api/orders/:id` returned the newly created order payload.
- Confirmed the station_staff session stayed on `#/orders` after navigating to the orders page and that `apiClient.staff.getAll()` returned `Insufficient permissions`.
- Confirmed the driver session remained on `#/deliveries`, `apiClient.deliveries.getAll()` returned 2 assigned deliveries, and the new order appeared in the delivery list.
- Confirmed `apiClient.orders.getAll()` returned `Insufficient permissions` for the driver session.

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

## Fix 19: Forgot Password Login Flow
Status: Done

What changed:
- Added a `Forgot password?` action to the active login page so users can request a reset directly from the login card.
- Added `POST /api/auth/forgot-password` with account lookup checks against both Firebase Auth and `/users`, plus an active-account check before generating a reset link.
- Kept the flow role-agnostic so super_admin, admin, station_staff, driver, and customer accounts all use the same reset path.
- Added a `passwordReset` email template and exposed the request through `apiClient.auth.forgotPassword(...)`.

Validation:
- Ran `get_errors` on `routes/auth.js`, `public/js/api-client.js`, `public/js/components/login.js`, and `templates/emailTemplates.js`; all four files reported no errors.
- Ran `npm test`; 7 tests passed, 0 failed.
- Confirmed the Express router registers `POST /forgot-password` after loading `routes/auth.js` with a temporary `FIREBASE_DATABASE_URL` override in the shell.
- The route is ready to send reset links in production and returns the generated link in development when SMTP is not configured.

## Fix 20: Gmail EAUTH Fallback
Status: Done

What changed:
- Hardened the notification service so a Gmail `EAUTH` / `534-5.7.9` failure disables email delivery for the current process instead of repeatedly surfacing the same auth error.
- Kept the forgot-password flow usable in development by returning the generated reset link even when SMTP delivery fails.

Validation:
- Mocked `nodemailer.createTransport()` to throw a Gmail-style `EAUTH` / `534` error.
- Confirmed `notificationService.sendEmail(...)` returned `false` and flipped `isEmailConfigured()` from `true` to `false` after the failure.
- The validation run printed the expected warning: `SMTP authentication failed. Gmail requires an app-specific password. Email delivery has been disabled for this process.`
- Re-ran `npm test`; 7 tests passed, 0 failed.

## Fix 21: Orders Status Update Assigned Driver Guard
Status: Done

What changed:
- Updated the order status route so it only writes `assignedDriver` when a defined value exists.
- Prevented Firebase Realtime Database from rejecting status updates when an order has no assigned driver yet.

Validation:
- Replayed the `PATCH /api/orders/:id/status` handler with a mocked order that had no `assignedDriver` field.
- Confirmed the captured RTDB update payload only contained `status`, `updatedBy`, and `updatedAt`.
- Confirmed the handler returned `200` with `Order status updated successfully`.

## Fix 22: Dashboard Revenue Uses Completed Orders Only
Status: Done

What changed:
- Updated the dashboard stats route so total revenue is summed only from completed orders.
- Treated `delivered` and legacy `completed` as completion states so older data still contributes correctly.

Validation:
- Ran `get_errors` on [routes/dashboard.js](routes/dashboard.js); no syntax errors were reported.
- Executed the dashboard stats handler with mixed order statuses: pending, processing, delivered, completed, and cancelled.
- Confirmed revenue only included the completed orders and returned `70` for the mixed sample (`30` delivered + `40` completed).

## Fix 23: Notifications API Client Wiring
Status: Done

What changed:
- Added a `notifications` client to [public/js/api-client.js](public/js/api-client.js) so the SPA can call the existing backend notifications route.
- Exposed list, unread count, mark read, mark all read, delete, test notification, and settings endpoints through one centralized client surface.
- Added a `readAll` alias so either frontend naming convention maps to the same `PATCH /notifications/mark-all-read` route.

Validation:
- Ran `get_errors` on [public/js/api-client.js](public/js/api-client.js); no errors were reported.
- Ran `npm test`; 7 tests passed, 0 failed.

## Fix 24: Browser Pass, Auth Check, and Content Sweep
Status: Done

What changed:
- Ran a fresh browser pass on the live app from the login page through the authenticated routes.
- Verified station_staff access on Dashboard, Orders, Inventory, and Profile, and confirmed Staff, Reports, and Deliveries redirect back to Dashboard for that role.
- Verified driver access on Deliveries and Profile, and confirmed Orders and Inventory return `Insufficient permissions` through the API for that role.
- Created a new inventory product and two test orders from the browser, then fetched the updated tables back through the SPA and API client.
- Confirmed the driver workflow transitions the assigned delivery from `pending` to `in_transit` and then removes it from the active deliveries list after `delivered`.

Validation:
- Logged in as station_staff `zech@gmail.com` with the shared temp password and confirmed the dashboard rendered real stats.
- Created product `Browser Water 428` and confirmed it appeared in the Inventory table.
- Created order `Browser Customer 428` and confirmed it appeared in the Orders table.
- Created order `Browser Driver Order 428` with the driver auth UID, confirmed it appeared in Orders, and confirmed it showed up in Deliveries for `chan@gmail.com`.
- From the driver session, `apiClient.deliveries.getAll()` returned the active delivery list, while `apiClient.orders.getAll()` and `apiClient.inventory.getAll()` both returned `Insufficient permissions`.
- Marked the delivery `in_transit` and then `delivered`, after which the Deliveries page returned `No active deliveries assigned.`