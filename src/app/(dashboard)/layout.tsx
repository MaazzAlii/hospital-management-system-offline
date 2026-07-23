import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { getCurrentUserRole } from "@/lib/auth-utils";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await getCurrentUserRole();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar — hidden on mobile */}
      <aside className="hidden md:flex">
        <Sidebar userRole={role} />
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar user={{ name: user?.email || "Admin", email: user?.email || "", role: role || "" }} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
