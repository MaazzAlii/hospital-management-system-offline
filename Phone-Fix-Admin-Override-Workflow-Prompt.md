# Task: Fix Phone Input Bug, Admin Delete Override, and Add Standing Workflow Rules

## Part A — Fix the phone number input (critical bug)

Current bug: typing digits produces garbage (e.g. typing "34" shows "929-292929"), and backspace doesn't reliably clear the field. This is very likely caused by the formatting/sanitization logic recomputing from a stale or already-formatted value on every keystroke instead of tracking the raw typed digits as the source of truth.

Rewrite `src/components/ui/phone-number-input.tsx` properly:
1. Keep a single source of truth: the **raw digit string** (e.g. `"3001234567"`), stored in component/form state — never derive the next raw value from the *formatted display string*.
2. On every keystroke, extract only digits from the new input event, cap at the correct max length, and set that as the raw value.
3. Compute the **display value** (with formatting like `3XX-XXXXXXX`) purely as a function of the raw value, recalculated fresh each render — never mutate the display string directly.
4. Test backspace/delete explicitly: deleting from the middle or end must remove exactly one digit from the raw value and reformat correctly, not fight the cursor or refuse to clear.
5. Test clearing the field completely (select-all + delete, or repeated backspace) — must result in a genuinely empty field, not a leftover formatted fragment.

## Part B — Country code: make it selectable, not hardcoded

Replace the fixed `+92` badge with a **country code selector** (dropdown or searchable select), defaulting to `+92` (Pakistan) but changeable — since patients may be from other countries. A simple static list of common countries (Pakistan, India, UAE, Saudi Arabia, UK, USA, etc. — keep it short, doesn't need to be exhaustive) is enough; don't add a large external library just for this. Validation should adjust expected digit length per selected country if easy to do, or fall back to a generic "at least 7 digits" check for non-Pakistan numbers rather than enforcing the Pakistani 10-digit rule universally.

## Part C — Fix "Cannot delete... contact an admin" — build the actual override or fix the message

Currently the blocked-delete message tells the user to "contact an admin" but no such override exists. Pick one:
- **Preferred:** Build a real Admin-only override. When a user with the Admin role attempts to delete a patient/appointment that has linked records, show a stronger warning (e.g. "This will also remove N linked appointments/invoices — this cannot be undone") and allow them to proceed if they explicitly confirm. Non-admin users still see the current blocked message.
- **Fallback (if the above is too large for now):** Change the message to something accurate and non-misleading, e.g. "Cannot delete — this record has linked history and must be kept for audit purposes." Don't reference contacting an admin unless that path actually exists.

## Part D — Group pharmacy-related sidebar items (include this)
Collapse Medicines / Suppliers / Purchases / Sales / Daily Returns / Expiry Report under a single collapsible "Pharmacy" section in the sidebar, matching how the routes are already nested under `/pharmacy/*`. Pure UI organization, low risk — go ahead and build this.

## Part E — Notifications: OUT OF SCOPE for this batch, do not build
Current notification scope (stock/expiry alerts) stays as-is. Do NOT add appointment-related notifications or a patient queue/token display in this batch — this was discussed and deliberately deferred as a separate future feature to be scoped and priced on its own, not folded into this delivery. If you're tempted to build it because it seems related, don't — stay scoped to Parts A, B, C, and D only.

---

# Standing Workflow Rules — add as a permanent file in the repo

Create `AGENT_WORKFLOW.md` at the project root with this content, and reference/follow it on every task going forward without needing it repeated in each prompt:

```markdown
# Agent Workflow Rules (Permanent — Follow on Every Task)

1. Commit every logical change individually with a clear, conventional commit message
   (feat/fix/docs/chore(scope): description) — do not bundle unrelated changes into one commit.
2. After committing, push to BOTH remotes every time:
   git push origin main
   git push maazzalii main
3. After completing any feature or fix, before reporting it done:
   - Build the full Electron packaging pipeline (npx prisma generate,
     node scripts/copy-prisma-engine.js, npm run electron:build).
   - Launch the actual installed/unpacked .exe directly — not dev mode,
     not a manually-run `next start` in a terminal — and confirm the
     address bar / running port matches the packaged app (3456), not
     a dev server (3000).
   - Manually click through the new/changed feature in that real running app.
   - Take screenshots of the real result from that session only.
4. Commit screenshots individually (or in one clearly-scoped commit),
   add them to README.md under the relevant feature section, commit that too,
   and push both remotes again.
5. Do not report a task as "verified" or "complete" unless steps 3–4 actually
   happened in that session — check the address bar in each screenshot
   before including it in any report.
6. If a bug is found during this verification, fix it before reporting
   completion — don't report a task done with a known bug and expect
   a follow-up round to catch it.
```

Commit this file itself following its own first rule (as its own commit, pushed to both remotes).

## Build & verify this batch
```
npx prisma generate
node scripts/copy-prisma-engine.js
npm run electron:build
```
Launch the real installed `.exe`, manually test the phone input (typing, backspace, full clear, different country codes) and the delete-override/message fix, per `AGENT_WORKFLOW.md`.
