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
