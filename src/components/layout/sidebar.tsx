"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronDown,
  Building2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { hasAccess } from "@/lib/permissions";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  module: string;
}

interface NavGroup {
  name: string;
  icon: any;
  module: string;
  children: NavItem[];
}

type SidebarEntry = NavItem | NavGroup;

const navigationItems: SidebarEntry[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
  { name: "Patients", href: "/patients", icon: Users, module: "patients" },
  { name: "Doctors", href: "/doctors", icon: Stethoscope, module: "doctors" },
  { name: "Appointments", href: "/appointments", icon: Calendar, module: "appointments" },
  { name: "OPD Visits", href: "/opd", icon: Stethoscope, module: "opd" },
  {
    name: "Pharmacy",
    icon: Pill,
    module: "pharmacy",
    children: [
      { name: "Medicines", href: "/pharmacy/medicines", icon: Pill, module: "pharmacy" },
      { name: "Suppliers", href: "/pharmacy/suppliers", icon: Truck, module: "pharmacy" },
      { name: "Purchases", href: "/pharmacy/purchases", icon: ShoppingCart, module: "pharmacy" },
      { name: "Sales & POS", href: "/pharmacy/sales", icon: Receipt, module: "pharmacy" },
      { name: "Daily Returns", href: "/pharmacy/returns", icon: RotateCcw, module: "pharmacy" },
      { name: "Expiry Report", href: "/pharmacy/expiry-report", icon: AlertTriangle, module: "pharmacy" },
    ],
  },
  { name: "Lab Tests", href: "/lab/tests", icon: Beaker, module: "lab" },
  { name: "Lab Orders", href: "/lab/orders", icon: FlaskConical, module: "lab" },
  { name: "Billing", href: "/billing", icon: CreditCard, module: "billing" },
  { name: "Settings", href: "/settings", icon: Settings, module: "settings" },
];

export function Sidebar({ className, userRole }: { className?: string; userRole?: string | null }) {
  const pathname = usePathname();
  const isPharmacyRoute = pathname?.startsWith("/pharmacy");

  const [isPharmacyOpen, setIsPharmacyOpen] = useState<boolean>(true);

  // Auto-expand if navigating to pharmacy
  useEffect(() => {
    if (isPharmacyRoute) {
      setIsPharmacyOpen(true);
    }
  }, [isPharmacyRoute]);

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
        <nav className="grid items-start gap-1.5 px-2 py-4 lg:px-3">
          {navigationItems.map((item) => {
            // Check permission
            if (!hasAccess(userRole || null, item.module, "read")) {
              return null;
            }

            // Check if group (Pharmacy)
            if ("children" in item) {
              const hasActiveChild = item.children.some(
                (child) => pathname?.startsWith(child.href)
              );

              return (
                <div key={item.name} className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setIsPharmacyOpen(!isPharmacyOpen)}
                    className={cn(
                      "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-primary hover:bg-muted/50",
                      hasActiveChild ? "text-primary font-semibold" : "text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon
                        className={cn(
                          "h-4 w-4",
                          hasActiveChild ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                        )}
                      />
                      <span>{item.name}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200 opacity-60 group-hover:opacity-100",
                        isPharmacyOpen ? "rotate-0" : "-rotate-90"
                      )}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isPharmacyOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden pl-4 pr-1 flex flex-col gap-1 border-l-2 border-primary/20 ml-4 my-0.5"
                      >
                        {item.children.map((child) => {
                          const isChildActive = pathname?.startsWith(child.href);
                          return (
                            <Link
                              key={child.name}
                              href={child.href}
                              className={cn(
                                "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:text-primary",
                                isChildActive
                                  ? "text-primary font-semibold bg-primary/10"
                                  : "text-muted-foreground hover:bg-muted/40"
                              )}
                            >
                              <child.icon
                                className={cn(
                                  "h-3.5 w-3.5",
                                  isChildActive
                                    ? "text-primary"
                                    : "text-muted-foreground group-hover:text-primary"
                                )}
                              />
                              <span>{child.name}</span>
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            // Normal single item
            const isActive =
              pathname?.startsWith(item.href) || (pathname === "/" && item.href === "/dashboard");

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-primary",
                  isActive ? "text-primary font-semibold" : "text-muted-foreground"
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
                <item.icon
                  className={cn(
                    "h-4 w-4 z-10",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )}
                />
                <span className="z-10">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}
