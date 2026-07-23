import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth-utils";
import { hasAccess } from "@/lib/permissions";
import { headers } from "next/headers";

export default async function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await getCurrentUserRole();
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") || "";

  // The x-invoke-path header gives us the current pathname. 
  // Let's determine the module based on the pathname
  let module = "dashboard";
  if (pathname.startsWith("/patients")) module = "patients";
  else if (pathname.startsWith("/doctors")) module = "doctors";
  else if (pathname.startsWith("/appointments")) module = "appointments";
  else if (pathname.startsWith("/opd")) module = "opd";
  else if (pathname.startsWith("/pharmacy")) module = "pharmacy";
  else if (pathname.startsWith("/lab")) module = "lab";
  else if (pathname.startsWith("/billing")) module = "billing";
  else if (pathname.startsWith("/settings")) module = "settings";

  if (!hasAccess(role, module, "read")) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
