import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isCandidate = user?.user_metadata?.role === "candidate";

  // ── Protect /admin routes ──
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Candidates cannot access the admin area
    if (isCandidate) {
      return NextResponse.redirect(new URL("/my-profile", request.url));
    }
  }

  // ── Protect /my-profile route ──
  if (pathname.startsWith("/my-profile")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
    // Only candidates can access their profile page
    if (!isCandidate) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // ── Login page: redirect authenticated users to the right place ──
  if (pathname === "/login" && user) {
    const dest = isCandidate ? "/my-profile" : "/admin";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/my-profile/:path*", "/login"],
};
