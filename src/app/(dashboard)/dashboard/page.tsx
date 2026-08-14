import { Users, Calendar, Stethoscope, CreditCard, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserRole } from "@/lib/auth-utils";
import { getEarningsData } from "@/app/actions/earnings";
import { EarningsDashboardSection } from "@/components/dashboard/EarningsDashboardSection";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await getCurrentUserRole();

  // Initial Monthly Earnings Data
  const initialEarnings = await getEarningsData("monthly");

  // ── Stats ──────────────────────────────────────────────────────────

  const totalPatients = await prisma.patient.count();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaysAppointments = await prisma.appointment.count({
    where: {
      scheduledAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  const activeDoctors = await prisma.doctor.count({
    where: {
      status: "active",
    },
  });

  // Revenue for current month (paid + partial invoices)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  const invoiceRevenue = await prisma.invoice.aggregate({
    _sum: {
      total: true,
    },
    where: {
      status: {
        in: ["paid", "partial"],
      },
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  const currentMonthRevenue = invoiceRevenue._sum.total ?? 0;

  const stats = [
    {
      label: "Total Patients",
      value: (totalPatients ?? 0).toLocaleString(),
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Today's Appointments",
      value: (todaysAppointments ?? 0).toString(),
      icon: Calendar,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Active Doctors",
      value: (activeDoctors ?? 0).toString(),
      icon: Stethoscope,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Revenue (This Month)",
      value: `₨ ${currentMonthRevenue.toLocaleString()}`,
      icon: CreditCard,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ];

  // ── Recent Activity ────────────────────────────────────────────────

  const recentPatients = await prisma.patient.findMany({
    select: {
      name: true,
      mrn: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  const recentAppointmentsRaw = await prisma.appointment.findMany({
    select: {
      createdAt: true,
      patient: {
        select: {
          name: true,
        },
      },
      doctor: {
        select: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  const recentInvoices = await prisma.invoice.findMany({
    select: {
      invoiceNo: true,
      total: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  type ActivityItem = { time: Date; action: string; name: string };

  const allActivity: ActivityItem[] = [
    ...(recentPatients ?? []).map((p) => ({
      time: new Date(p.createdAt),
      action: "New patient registered",
      name: `${p.name} (${p.mrn})`,
    })),
    ...(recentAppointmentsRaw ?? []).map((a) => {
      const patientName = a.patient?.name ?? "—";
      const doctorName = a.doctor?.user?.name ?? "—";
      return {
        time: new Date(a.createdAt),
        action: "Appointment booked",
        name: `Dr. ${doctorName} – ${patientName}`,
      };
    }),
    ...(recentInvoices ?? []).map((i) => ({
      time: new Date(i.createdAt),
      action: "Invoice generated",
      name: `${i.invoiceNo} – ₨ ${Number(i.total).toLocaleString()}`,
    })),
  ];

  allActivity.sort((a, b) => b.time.getTime() - a.time.getTime());
  const recentActivity = allActivity.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back! Here&apos;s what&apos;s happening at LIFE CARE HOSPITAL today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Interactive Earnings & Revenue Analytics Dashboard */}
      <EarningsDashboardSection initialData={initialEarnings} />

      {/* Recent activity */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Recent Activity</h2>
        </div>
        <div className="space-y-3">
          {recentActivity.map((item, i) => {
            const timeStr = item.time.toLocaleTimeString("en-PK", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const dateStr = item.time.toLocaleDateString("en-PK", {
              month: "short",
              day: "numeric",
            });
            return (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-end min-w-[72px]">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{timeStr}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                </div>
                <div className="flex-1 border-l pl-3">
                  <p className="text-sm font-medium leading-none">{item.action}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.name}</p>
                </div>
              </div>
            );
          })}
          {recentActivity.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No recent activity.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
