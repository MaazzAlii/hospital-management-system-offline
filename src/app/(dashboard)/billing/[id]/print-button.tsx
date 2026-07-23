"use client";

import { Printer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function PrintButton({ invoiceId }: { invoiceId?: string }) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => window.print()}
      >
        <Printer className="h-4 w-4" />
        Print Invoice
      </Button>
      {invoiceId && (
        <a 
          href={`/api/pdf/invoice/${invoiceId}`} 
          download 
          target="_blank" 
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "default", size: "sm", className: "gap-2" })}
        >
          <Printer className="h-4 w-4" />
          Download PDF
        </a>
      )}
    </div>
  );
}
