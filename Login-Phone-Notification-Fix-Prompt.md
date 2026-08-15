# Task: Login Screen Cleanup, Phone Number Validation, and Notification Bell Fix

## Part A — Remove test credentials from the login screen
The login page currently displays a "Test Accounts (Password: password123)" block with real working email addresses directly on the UI. This must not ship to the client.
- Remove this block entirely from the production build, OR
- Gate it behind a build-time flag (e.g. only show if `process.env.NODE_ENV !== 'production'`) if it's genuinely useful during your own testing — but confirm it does NOT render in the packaged Electron build before the next delivery.

## Part B — Phone number field: country code + live length validation
Current behavior: the phone number field accepts arbitrary digits with no length feedback, so staff can't tell if a number is complete without counting manually.

Fix:
1. Add a fixed **+92** (Pakistan) country code prefix, displayed but not editable (unless there's a real need for international numbers — confirm, but default to Pakistan-only since this is a local clinic).
2. Enforce Pakistani mobile number format: 10 digits after the country code (e.g. `3XX-XXXXXXX`), matching the standard `03XX-XXXXXXX` local format minus the leading 0.
3. Add **live validation feedback** as the user types:
   - Show a green checkmark when the number reaches the correct length and matches the expected pattern.
   - Show a red indicator/message if too short, too long, or contains invalid characters (non-digits).
   - Disable form submission (or show a clear inline error) if the phone number is incomplete when the user tries to submit.
4. Apply this same validation component consistently everywhere a phone number is collected (Patient registration, Salesman Mobile#, Supplier contact, etc.) — build it as one reusable component (e.g. `PhoneNumberInput.tsx`) rather than duplicating validation logic per form.

## Part C — Fix the notification bell
The notification bell shows a red dot (unread indicator) but clicking it shows no notifications. Investigate and fix:
1. Check whether notifications are actually being created in the `Notification` model when relevant events happen (e.g. low stock, expiring batches, new appointment) — if the backend never creates them, the red dot may be triggered by unrelated logic (a bug) while the list is correctly empty.
2. Check the dropdown/panel component that should render on bell click — confirm it's actually fetching and displaying `Notification` records for the current user, and that the click handler is wired correctly (not silently failing).
3. If notifications aren't being generated at all yet, decide: either wire up real triggers now (e.g. expiring-soon batches, low stock alerts — these fit naturally given the batch/expiry work already done) or temporarily hide the red dot until notifications are actually implemented, so it doesn't mislead users into thinking something's wrong with the app.

## Testing before rebuild
- Confirm test credentials block does not appear in the packaged app.
- Enter a phone number character by character — confirm the checkmark only appears at the correct length, and incomplete numbers are visibly flagged.
- Try submitting a form with an incomplete phone number — confirm it's blocked with a clear message.
- Click the notification bell — confirm it either shows real notifications or the red dot is removed if there's nothing to show.

## Build & verify — DO THIS IN THE ACTUAL PACKAGED APP, NOT DEV MODE
```
npx prisma generate
node scripts/copy-prisma-engine.js
npm run electron:build
```
Then install and launch the real `.exe`, confirm the address bar / window shows the app running correctly, and manually test all three fixes by clicking through the real installed app before reporting completion. Take screenshots from this session only, and verify each screenshot before saving it.
