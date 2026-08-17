# Task: Fix Invoice PDF Header Line Wrapping (Email Split Mid-Word)

## Bug
On the generated Invoice PDF header, the contact line ("Nawagai, Buner, Khyber Pakhtunkhwa | Phone: 03439626941 | Email: shakeelbuneri933@gmail.com") is too long to fit on one line at the current width. It's currently wrapping by breaking the email address mid-word with a hyphen ("shakeel-" on one line, "buneri933@gmail.com" on the next), which looks broken/unprofessional.

## Fix
In `src/components/pdf/InvoicePDF.tsx` (and `src/components/pdf/LabReportPDF.tsx` if it has the same header pattern — check it too), find the style for this contact/header line and:
1. Prevent word-breaking inside the email/phone text specifically — add `overflowWrap: 'normal'` and remove/avoid any `wordBreak: 'break-all'` or hyphenation on this line, so it can only wrap at natural spaces (between the address, phone, and email segments), never mid-word.
2. If the line still doesn't fit cleanly, put each piece (Address / Phone / Email) on its own line instead of one long pipe-separated line — this is the more robust fix and avoids relying on wrapping behavior entirely. Example layout:
   ```
   Nawagai, Buner, Khyber Pakhtunkhwa
   Phone: 03439626941  |  Email: shakeelbuneri933@gmail.com
   ```
   or all three stacked if space is tight — whichever looks cleanest given the header's actual width in the PDF layout.
3. Slightly reduce font size for this contact line if needed to help it fit, but the primary fix is controlling where it's allowed to break, not just shrinking text.

## Verify
Generate a real invoice PDF in the packaged app and confirm the email displays on one continuous line (or cleanly on its own line if stacked), with no mid-word hyphen break anywhere in the header.

Small, isolated fix — no schema or data changes needed. Follow `AGENT_WORKFLOW.md` for commit/build/verify as usual, but this doesn't need a full re-verification of unrelated features, just the PDF header rendering.
