import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Legacy paths from before the app moved under /app (root "/" is now the
// public agenda page) — redirect bookmarks/links so they don't 404.
const LEGACY_APP_PREFIXES = [
  "/schedule",
  "/bookings",
  "/areas",
  "/activities",
  "/organizers",
  "/settings",
  "/more",
  "/analytics",
];

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const legacyPrefix = LEGACY_APP_PREFIXES.find(
    (p) => path === p || path.startsWith(`${p}/`),
  );
  if (legacyPrefix) {
    const url = request.nextUrl.clone();
    url.pathname = `/app${path}`;
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // Only the internal app (under /app) requires auth — "/" is now the
  // public agenda page.
  const isProtected = path === "/app" || path.startsWith("/app/");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
