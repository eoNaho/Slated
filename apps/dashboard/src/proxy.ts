import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:3001";

const PROTECTED_PATHS = [
  "/dashboard",
  "/community",
  "/clubs",
  "/content",
  "/discussions",
  "/premium",
  "/system",
  "/audit-logs",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();

  const cookieHeader = request.headers.get("cookie") ?? "";

  try {
    const res = await fetch(`${API_ORIGIN}/api/auth/get-session`, {
      headers: { Cookie: cookieHeader },
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.user?.role === "admin" || data?.user?.role === "moderator") {
        return NextResponse.next();
      }
    }
  } catch {
    // API unreachable — fall through to redirect
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/community/:path*",
    "/clubs/:path*",
    "/content/:path*",
    "/discussions/:path*",
    "/premium/:path*",
    "/system/:path*",
    "/audit-logs/:path*",
  ],
};
