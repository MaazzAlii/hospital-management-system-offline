import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "./lib/session";
import { hasAccess } from "./lib/permissions";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal Next.js requests (turbopack HMR, static assets, API)
  if (
    pathname.startsWith("/_next") ||
    pathname.includes("__nextjs") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request.cookies, response.cookies, sessionOptions);

  const isAuthPage = pathname.startsWith("/login");

  // Unauthenticated user attempting to access protected route
  if (!session.isLoggedIn && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated user attempting to access login page
  if (session.isLoggedIn && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // RBAC Checks for Protected Routes
  if (session.isLoggedIn && !isAuthPage) {
    const roleName = session.role || null;

    let module = "dashboard";
    if (pathname.startsWith("/patients")) module = "patients";
    else if (pathname.startsWith("/doctors")) module = "doctors";
    else if (pathname.startsWith("/appointments")) module = "appointments";
    else if (pathname.startsWith("/opd")) module = "opd";
    else if (pathname.startsWith("/pharmacy")) module = "pharmacy";
    else if (pathname.startsWith("/lab")) module = "lab";
    else if (pathname.startsWith("/billing")) module = "billing";
    else if (pathname.startsWith("/settings")) module = "settings";

    if (!hasAccess(roleName, module, "read")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
