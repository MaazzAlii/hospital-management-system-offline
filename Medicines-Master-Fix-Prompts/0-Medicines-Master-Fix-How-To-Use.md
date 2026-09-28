# How to use these two prompts with Antigravity

Two separate fix prompts, matching the client's two reported issues. Both root causes were found by reading `medicine.ts`, the Medicines Master page, the Edit Medicine form, and `schema.prisma` directly — these are confirmed fixes, not guesses.

1. `Medicines-Master-Scale-Pagination-Fix-Prompt.md` — Issue 1: list disappearing / count = 0 at scale.
2. `Medicine-Edit-Batch-Expiry-Fix-Prompt.md` — Issue 2: Batch Number & Expiry Date not editable.

Do them one at a time, in this order (1 first, since it's the data-visibility bug; 2 is independent and can technically go either order, but do it second so you're not testing batch edits against a list that's still silently failing).

For each prompt, paste this to Antigravity first, then paste the file's contents in the same message or the next one:

> "Read `AGENT_WORKFLOW.md` and follow its rules for this whole task. Then read the attached fix prompt fully before writing any code. Confirm you understand the root cause before touching any file. Modify only the files named in the prompt (plus anything the prompt explicitly tells you to grep for and check). Show the complete diff before considering this done. Do not delete or alter any existing medicine, batch, purchase, or stock movement data — both fixes are additive/read-path changes only, as the prompt explains."

After each one, do NOT report it done until the Verification section at the bottom of that file has actually been carried out against the real packaged `.exe` (per `AGENT_WORKFLOW.md`, step 3) — Issue 1 in particular will not reproduce in a small dev database, so it must be verified with a few thousand seeded test medicines, not just a handful.
