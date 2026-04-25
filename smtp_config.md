# SMTP Configuration Plan

## Goal
Configure SMTP so every newly added staff member receives the generated temporary password at their email address.

## Current Flow
- `routes/staff.js` creates the Firebase Auth account for the new staff member.
- The route writes the mirrored `/users/{uid}` profile and the `/staff/{id}` record.
- `services/notificationService.js` sends the `temporaryPassword` email template when SMTP credentials are available.
- `.env.example` already documents the SMTP and OTP environment variables needed for delivery.

## Implementation Steps
1. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in `.env`.
2. Keep the onboarding email on the `temporaryPassword` template so the new staff member receives the login password and verification details in one message.
3. Confirm the staff creation route passes the generated temporary password into the email payload.
4. Verify the notification service can build the transporter and send the mail without falling back to the development no-op path.
5. Use a real staff creation request and confirm the recipient inbox receives the onboarding email.

## Validation Checklist
- Staff creation returns the generated temporary password in development.
- Staff creation stores the mirrored user profile and staff row.
- SMTP-enabled environments send the onboarding email to the new staff address.
- The email content includes the temporary password and the verification code.

## Notes
- If SMTP credentials are not configured, the app keeps the onboarding flow working in development but skips outbound delivery.
- Live delivery still needs a real SMTP account and mailbox access for final inbox confirmation.