"use client";

import { useState } from "react";
import { Printer, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadPdfFile, printPdfDirect } from "@/lib/client-pdf";

export default function PrintButton({ invoiceId }: { invoiceId?: string }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  async function handleDownload() {
    if (!invoiceId) return;
    setIsDownloading(true);
    try {
      await downloadPdfFile(`/api/pdf/invoice/${invoiceId}`, `Invoice-${invoiceId}.pdf`);
    } catch (err: any) {
      console.error("Failed to download PDF invoice:", err);
      alert(err.message || "Failed to download PDF");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handlePrint() {
    if (!invoiceId) {
      window.print();
      return;
    }
    setIsPrinting(true);
    try {
      await printPdfDirect(`/api/pdf/invoice/${invoiceId}`);
    } catch (err: any) {
      console.warn("Direct PDF print failed, falling back to window.print():", err);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        className="gap-2"
        disabled={isPrinting}
        onClick={handlePrint}
      >
        {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
        Print Invoice
      </Button>
      {invoiceId && (
        <Button
          size="sm"
          variant="default"
          className="gap-2"
          disabled={isDownloading}
          onClick={handleDownload}
        >
          {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download PDF
        </Button>
      )}
    </div>
  );
}
