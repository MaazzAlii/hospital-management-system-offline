# Task: Fix PDF Auth via Fetch+Blob (Corrected), Applied Everywhere + Lab Orders Date Fix

## Approach confirmed: use fetch+Blob, not window-session-sharing
Use the fetch-as-Blob approach (fetching the PDF via `fetch()` in the same already-authenticated window, then triggering a download or print from the resulting Blob) rather than trying to force a new Electron window to share the session. This is more robust — it avoids opening a second window/webview entirely, so there's no session-sharing ambiguity to get wrong.

## Fix 1 — Create the shared PDF fetch/download/print utility

Create `src/lib/client-pdf.ts` with two functions: `downloadPdfFile(url, filename)` and `printPdfDirect(url)`, both using `fetch()` (same-origin, cookies included automatically — no special headers needed) and converting the response to a Blob for download or hidden-iframe printing. Handle non-OK responses by reading the error text and surfacing it clearly (e.g. a toast, not a raw `alert()` if the app has a toast system already — check for one and use it instead of `alert`).

## Fix 2 — Apply this to EVERY PDF link in the app, not just one button

Audit and replace every instance of a raw `<Link href="/api/pdf/...">` or `<a href="/api/pdf/...">` with the new `downloadPdfFile`/`printPdfDirect` utility. Confirmed locations to fix (found via codebase search — check for any others too):
- Sales invoice PDF link (sale detail page — `/api/pdf/invoice/${sale.id}`)
- Purchase invoice PDF link — both the Purchases list page and Purchase detail page (`/api/pdf/purchase/${purchase.id}`)
- Billing print button (`/api/pdf/invoice/${invoiceId}` or similar)
- Lab Report PDF link (`/api/pdf/lab-report/${order.id}` or wherever this is triggered from — locate it, since it wasn't in the original file list but the route exists)

Do not leave any PDF trigger as a raw link/anchor — every one needs to go through the new fetch+Blob utility for consistent, reliable auth handling.

## Fix 3 — Do NOT implement any "Super Admin bypass" for local processes
Skip this entirely — it's unnecessary once the fetch+Blob fix is in place, and weakening auth checks for "local Electron process" requests is a real security risk if done carelessly. The auth check in the PDF routes (`getCurrentUserRole()`) is working correctly and should not be modified or bypassed.

## Fix 4 — Rewrite the print button component correctly (do not copy broken code)
Rewrite `src/app/(dashboard)/billing/[id]/print-button.tsx` (and any equivalent print/download buttons elsewhere) as clean, valid TSX using the new utility — do not paste in malformed JSX. Example structure (adapt exactly, don't reuse broken syntax from prior drafts):
```tsx
"use client";
import { useState } from "react";
import { Printer, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadPdfFile } from "@/lib/client-pdf";

export default function PrintButton({ invoiceId }: { invoiceId?: string }) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    if (!invoiceId) return;
    setIsDownloading(true);
    try {
      await downloadPdfFile(`/api/pdf/invoice/${invoiceId}`, `Invoice-${invoiceId}.pdf`);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" className="gap-2" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        Print Invoice
      </Button>
      {invoiceId && (
        <Button size="sm" variant="default" className="gap-2" disabled={isDownloading} onClick={handleDownload}>
          {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download PDF
        </Button>
      )}
    </div>
  );
}
```

## Fix 5 — Lab Orders "Invalid Date" — fix the root cause, not just the symptom

Two changes needed together:
1. **Fix the actual bug:** in `src/app/(dashboard)/lab/orders/page.tsx`, change `new Date(order.orderedAt).toLocaleDateString()` to `new Date(order.createdAt).toLocaleDateString()` — the `LabOrder` model has no `orderedAt` field, only `createdAt`. This is the real fix.
2. **Also add a safe formatter as defense-in-depth** (good addition from the draft, keep it) — create a shared `formatDisplayDate()` helper that returns `"—"` for any invalid/missing date rather than "Invalid Date", and use it consistently across the app's date displays (Lab Orders, and anywhere else dates are shown) so any *future* similar bug fails gracefully instead of showing a broken string to the client again.
3. Check whether `src/app/(dashboard)/lab-orders/page.tsx` (the separate, possibly-duplicate route found earlier) is still linked from the sidebar/navigation. If it's dead/unreachable code, remove it to avoid this kind of drift recurring; if it's genuinely still in use, apply the same date fix there too.

## Verify (per `AGENT_WORKFLOW.md`)
```
npx prisma generate
node scripts/copy-prisma-engine.js
npm run electron:build
```
Launch the real installed `.exe`, log in fresh, and click every PDF/print/download trigger across Sales, Purchases, Billing, and Lab Reports — confirm each produces a real PDF, not an Unauthorized page or a `.txt` download. Confirm Lab Orders list shows correct dates. Confirm `server-error.log` is clean.
