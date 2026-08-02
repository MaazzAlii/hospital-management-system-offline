# AI Execution Rules

This project is designed to be executed by an AI coding agent (Antigravity).

Before starting ANY implementation:

1. Read every document in this exact order:
   - `0-HMS-Execution-Sequence.md`
   - `1-HMS-Errors-Round3.md`
   - `2-HMS-Offline-Conversion-Guide.md`
   - `3-HMS-New-Features-Spec.md`
   - `4-HMS-Electron-Packaging-Guide.md`

2. Build complete understanding of:
   - Architecture
   - Folder structure
   - Current database
   - Authentication
   - Permissions
   - Features
   - Dependencies

3. NEVER start coding immediately.

4. Finish reading every document before making any modification.

5. Execute only one phase at a time. Within a phase, execute only one numbered step at a time.

6. After completing each step:
   - verify compilation
   - verify TypeScript
   - verify ESLint
   - verify runtime
   - verify database
   - verify permissions

7. Only after everything passes, continue to the next step. Only after every step in a phase passes, continue to the next phase.

8. If any verification fails, stop. Do not continue to the next step. Report the failure and follow that step's Rollback plan.

---

# Reusable Prompt Template

Every `🤖 Antigravity Execution Prompt` in these five documents already has this baked in — you don't need to re-paste this separately. It's included here so you understand what's implicitly true of every prompt in this project, and so you can reuse it if you write a new step yourself later.

```
You are modifying an enterprise healthcare application.

Before writing code:
1. Read every HMS documentation file in order.
2. Understand the current architecture.
3. Do not assume anything.
4. Search the entire repository before editing.
5. Modify only the required files.
6. Preserve coding style.
7. Do not introduce breaking changes.
8. Keep changes minimal and production-ready.
9. Verify TypeScript, ESLint, runtime, permissions, and database behavior.
10. Show the complete diff.
11. Wait for confirmation before continuing to the next step.

Definition of Done:
- Builds successfully
- No TypeScript errors
- No lint errors
- Feature tested
- No regressions
- Documentation updated if needed
```

---

# How to actually use these files with Antigravity

Every time you start a session, say to Antigravity:

> "Read `0-HMS-Execution-Sequence.md`, `1-HMS-Errors-Round3.md`, `2-HMS-Offline-Conversion-Guide.md`, `3-HMS-New-Features-Spec.md`, and `4-HMS-Electron-Packaging-Guide.md` in that order. Follow the AI Execution Rules at the top of the first file. Then execute [Phase X, Step Y]."

Then paste the specific `🤖 Antigravity Execution Prompt` block for that step. Don't paste multiple steps at once — one step, wait for it to pass its Definition of Done, then move to the next.

---

# Phase Overview

## Phase 1 — Fix the last open error
📄 `1-HMS-Errors-Round3.md`
One real fix (patient page showing billing data to Doctors). Small, low-risk, do it on the current codebase before rewriting anything.

## Phase 2 — Convert the backend to fully offline (Supabase → SQLite)
📄 `2-HMS-Offline-Conversion-Guide.md`
The big one. Replaces the database, the auth system, and row-level security with a local SQLite file, Prisma, and simple local sessions.

**Why before new features:** the pharmacy and lab changes in Phase 3 touch the exact tables being rewritten here.

**Why before packaging:** you can't package what doesn't work yet.

## Phase 3 — Build the two new feature sets
📄 `3-HMS-New-Features-Spec.md`
Pharmacy Sales (expiry/stock/sale-date) and Lab (price list/discounts), built against the new SQLite schema from Phase 2.

## Phase 4 — Package as a desktop installer
📄 `4-HMS-Electron-Packaging-Guide.md`
Wrap the finished, fully offline, feature-complete app in Electron and produce the single `.exe` installer to send to the client.

---

# Before you call it done

Once Phase 4 produces an installer: install it on a machine, **disconnect that machine from the internet entirely**, and run through every role's core workflow — register a patient, book an appointment, place a lab order with a discount, process a pharmacy sale with an expiring batch, generate both PDFs. If everything works with the network cable pulled out, you've actually met the requirement.
