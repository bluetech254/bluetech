import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get("admin_session")?.value;

  if (!cookie) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const session = JSON.parse(cookie);
    if (!session?.id || session.exp < Date.now()) {
      const res = NextResponse.redirect(new URL("/login", req.url));
      res.cookies.set("admin_session", "", { maxAge: 0, path: "/" });
      return res;
    }
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
