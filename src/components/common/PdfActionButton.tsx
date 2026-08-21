"use client";

import React, { useState } from "react";
import { Loader2, Download, Printer, FileText } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";
import { downloadPdfFile, printPdfDirect } from "@/lib/client-pdf";

interface PdfActionButtonProps extends Omit<ButtonProps, "onClick"> {
  url: string;
  filename?: string;
  mode?: "download" | "print";
  label?: string;
  showIcon?: boolean;
}

export function PdfActionButton({
  url,
  filename = "document.pdf",
  mode = "download",
  label,
  showIcon = true,
  variant = "outline",
  size = "sm",
  className,
  disabled,
  children,
  ...props
}: PdfActionButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading || disabled) return;

    setLoading(true);
    try {
      if (mode === "print") {
        await printPdfDirect(url);
      } else {
        await downloadPdfFile(url, filename);
      }
    } catch (err: any) {
      console.error("[PdfActionButton] Operation failed:", err);
      alert(err.message || "Failed to process PDF.");
    } finally {
      setLoading(false);
    }
  };

  const defaultIcon = () => {
    if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (mode === "print") return <Printer className="h-4 w-4" />;
    return <Download className="h-4 w-4" />;
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {showIcon && defaultIcon()}
      {children || label || (mode === "print" ? "Print PDF" : "Download PDF")}
    </Button>
  );
}
