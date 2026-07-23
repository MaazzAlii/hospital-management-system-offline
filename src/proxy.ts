import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasAccess } from "./lib/permissions";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal Next.js requests (turbopack HMR, etc.)
  if (
    pathname.startsWith("/_next") ||
    pathname.includes("__nextjs") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const isAuthPage = pathname.startsWith("/login");

  // Quick cookie check before making expensive Supabase network call.
  // Supabase stores session in cookies prefixed with 'sb-' and ending with '-auth-token'
  const hasSbCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  // If no session cookie and not on auth page → redirect immediately without calling Supabase
  if (!hasSbCookie && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If no session cookie and on auth page → just show the login page (no network call needed)
  if (!hasSbCookie && isAuthPage) {
    return NextResponse.next();
  }

  // Has a session cookie — validate it with Supabase (only for pages that need auth)
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If session cookie exists but it's invalid/expired
  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If logged-in user visits login page → redirect to dashboard
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // RBAC Checks for Protected Routes
  if (user && !isAuthPage) {
    // 1. Fetch User Role (using split query to avoid nested join bug)
    const { data: userData } = await supabase
      .from("User")
      .select("*")
      .eq("email", user.email)
      .single();

    let roleName = null;
    if (userData && userData.roleId) {
      const { data: roleData } = await supabase
        .from("Role")
        .select("name")
        .eq("id", userData.roleId)
        .single();
      if (roleData) {
        roleName = roleData.name;
      }
    }

    // 2. Map Path to Module
    let module = "dashboard";
    if (pathname.startsWith("/patients")) module = "patients";
    else if (pathname.startsWith("/doctors")) module = "doctors";
    else if (pathname.startsWith("/appointments")) module = "appointments";
    else if (pathname.startsWith("/opd")) module = "opd";
    else if (pathname.startsWith("/pharmacy")) module = "pharmacy";
    else if (pathname.startsWith("/lab")) module = "lab";
    else if (pathname.startsWith("/billing")) module = "billing";
    else if (pathname.startsWith("/settings")) module = "settings";

    // 3. Check Access
    if (!hasAccess(roleName, module, "read")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
