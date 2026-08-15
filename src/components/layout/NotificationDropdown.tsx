"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCheck,
  RefreshCw,
  ExternalLink,
  Package,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  getSystemNotifications,
  SystemNotificationItem,
  markAllNotificationsAsRead,
} from "@/app/actions/notification";

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await getSystemNotifications();
      // Filter out locally dismissed
      const filtered = res.notifications.filter((n) => !dismissedIds.has(n.id));
      setNotifications(filtered);
      setUnreadCount(filtered.length);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every 60s
    return () => clearInterval(interval);
  }, [dismissedIds]);

  const handleClearAll = async () => {
    await markAllNotificationsAsRead();
    const allIds = new Set(notifications.map((n) => n.id));
    setDismissedIds((prev) => new Set([...Array.from(prev), ...Array.from(allIds)]));
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissedIds((prev) => new Set(prev).add(id));
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      setUnreadCount(next.length);
      return next;
    });
  };

  const getSeverityIcon = (type: SystemNotificationItem["type"], severity: SystemNotificationItem["severity"]) => {
    if (type === "expired" || severity === "error") {
      return (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertOctagon className="h-4 w-4" />
        </div>
      );
    }
    if (type === "expiring_soon" || type === "low_stock" || severity === "warning") {
      return (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
        </div>
      );
    }
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Info className="h-4 w-4" />
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
            aria-label="View system notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow-sm animate-in zoom-in-50">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        }
      />

      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={fetchNotifications}
              disabled={loading}
              title="Refresh notifications"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleClearAll}
                className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[380px] overflow-y-auto divide-y">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="rounded-full bg-emerald-500/10 p-3 mb-2 text-emerald-600 dark:text-emerald-400">
                <Package className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground">All systems clear</p>
              <p className="text-xs text-muted-foreground mt-1">
                No unread alerts. Medicines, stock, and batches are in good standing!
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`p-3 transition-colors hover:bg-muted/40 flex items-start gap-3 text-left ${
                  item.severity === "error"
                    ? "bg-destructive/5"
                    : item.severity === "warning"
                    ? "bg-amber-500/5"
                    : ""
                }`}
              >
                {getSeverityIcon(item.type, item.severity)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {item.title}
                    </p>
                    <button
                      onClick={(e) => handleDismiss(item.id, e)}
                      className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground p-0.5"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>

                  {item.href && (
                    <div className="mt-2">
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      >
                        View details
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t p-2 text-center bg-muted/20">
            <Link
              href="/pharmacy/expiry-report"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Open Expiry & Stock Reports →
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
