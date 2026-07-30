import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  const raw = req.cookies.get("admin_session")?.value;
  if (!raw) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const session = JSON.parse(decodeURIComponent(raw));
    if (!session?.token || !session?.exp || Date.now() > session.exp) {
      const res = NextResponse.redirect(new URL("/login", req.url));
      res.cookies.delete("admin_session");
      return res;
    }
  } catch {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("admin_session");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
