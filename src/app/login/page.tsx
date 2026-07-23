"use client";

import { useState } from "react";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-6 flex items-center justify-center rounded-full bg-white/50 p-2 shadow-sm border">
          <img src="/logo.jpeg" alt="LIFE CARE HOSPITAL Logo" className="h-28 w-28 object-contain" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          LIFE CARE HOSPITAL
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sign in to your account to continue
        </p>
      </div>

      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <form action={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="e.g. admin@lifecare.com"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground" htmlFor="password">
                Password
              </label>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>

          <div className="mt-6 border-t pt-4">
            <div className="text-center text-xs text-muted-foreground">
              <p>Test Accounts (Password: password123):</p>
              <div className="mt-2 space-y-1 font-mono">
                <p>admin@lifecare.com</p>
                <p>reception@lifecare.com</p>
                <p>doctor@lifecare.com</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
