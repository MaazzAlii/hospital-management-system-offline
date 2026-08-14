"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Calendar,
  CreditCard,
  Settings,
  Pill,
  Truck,
  ShoppingCart,
  Receipt,
  RotateCcw,
  AlertTriangle,
  Beaker,
  FlaskConical,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const sidebarLinks = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Doctors", href: "/doctors", icon: Stethoscope },
  { name: "Appointments", href: "/appointments", icon: Calendar },
  { name: "OPD Visits", href: "/opd", icon: Stethoscope },
  { name: "Medicines", href: "/pharmacy/medicines", icon: Pill },
  { name: "Suppliers", href: "/pharmacy/suppliers", icon: Truck },
  { name: "Purchases", href: "/pharmacy/purchases", icon: ShoppingCart },
  { name: "Sales", href: "/pharmacy/sales", icon: Receipt },
  { name: "Daily Returns", href: "/pharmacy/returns", icon: RotateCcw },
  { name: "Expiry Report", href: "/pharmacy/expiry-report", icon: AlertTriangle },
  { name: "Lab Tests", href: "/lab/tests", icon: Beaker },
  { name: "Lab Orders", href: "/lab/orders", icon: FlaskConical },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Settings", href: "/settings", icon: Settings },
];

import { hasAccess } from "@/lib/permissions";

export function Sidebar({ className, userRole }: { className?: string; userRole?: string | null }) {
  const pathname = usePathname();

  // Filter links based on role
  const visibleLinks = sidebarLinks.filter(link => {
    // Map href prefixes to modules
    let module = 'dashboard';
    if (link.href.startsWith('/patients')) module = 'patients';
    if (link.href.startsWith('/doctors')) module = 'doctors';
    if (link.href.startsWith('/appointments')) module = 'appointments';
    if (link.href.startsWith('/opd')) module = 'opd';
    if (link.href.startsWith('/pharmacy')) module = 'pharmacy';
    if (link.href.startsWith('/lab')) module = 'lab';
    if (link.href.startsWith('/billing')) module = 'billing';
    if (link.href.startsWith('/settings')) module = 'settings';

    return hasAccess(userRole || null, module, 'read');
  });

  return (
    <div
      className={cn(
        "flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-3 font-semibold text-primary">
          <img src="/logo.jpeg" alt="LIFE CARE HOSPITAL" className="h-10 w-10 object-contain" />
          <span className="text-lg">LIFE CARE HOSPITAL</span>
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <nav className="grid items-start gap-2 px-2 py-4 lg:px-4">
          {visibleLinks.map((link) => {
            const isActive = pathname?.startsWith(link.href) || (pathname === "/" && link.href === "/dashboard");
            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-primary",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-lg bg-primary/10"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <link.icon className={cn("h-4 w-4 z-10", isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                <span className="z-10">{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}
