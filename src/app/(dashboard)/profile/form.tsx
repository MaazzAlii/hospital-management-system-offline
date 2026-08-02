"use client";

import { useState } from "react";
import { updateProfile } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { User, Mail, Lock, CheckCircle2 } from "lucide-react";

interface ProfileFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
}

export default function ProfileForm({ user }: ProfileFormProps) {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password && password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    if (password && password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters long." });
      return;
    }

    setIsSubmitting(true);

    const result = await updateProfile({
      name,
      email,
      password: password || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      setPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } else {
      setMessage({ type: "error", text: result.error || "Failed to update profile." });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {message.type === "success" && <CheckCircle2 className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-base font-semibold">Personal Information</h2>
        
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Full Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {user.role && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <input
              type="text"
              disabled
              value={user.role}
              className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground capitalize"
            />
          </div>
        )}
      </div>

      <div className="border-t pt-6 space-y-4">
        <h2 className="text-base font-semibold">Security / Change Password</h2>
        <p className="text-xs text-muted-foreground">
          Leave password fields blank if you do not wish to change your password.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              New Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Confirm New Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t pt-4">
        <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
          {isSubmitting ? "Updating..." : "Update Profile"}
        </Button>
      </div>
    </form>
  );
}
