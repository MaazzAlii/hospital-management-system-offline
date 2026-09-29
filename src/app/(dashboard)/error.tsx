"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for diagnostic tracing
    console.error("[Dashboard Error Boundary Caught]:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 text-center">
      <div className="max-w-md w-full bg-card border border-border shadow-lg rounded-xl p-8 space-y-5 text-card-foreground">
        <div className="flex justify-center">
          <div className="p-3 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-full">
            <AlertTriangle className="w-8 h-8" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred while loading this section. You can try refreshing the view
            or return to the main dashboard.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 bg-muted/70 rounded-md text-xs font-mono text-left text-destructive overflow-auto max-h-32 border border-destructive/20">
            {error.message}
          </div>
        )}

        {error?.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            Reference ID: <span className="font-semibold">{error.digest}</span>
          </p>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="default"
            onClick={() => reset()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            className="flex items-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
