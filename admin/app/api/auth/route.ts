import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function POST(req: NextRequest) {
  const body = await req.json();

  const res = await fetch(`${BASE}/api/v1/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  const { access_token, admin } = data;
  const session = {
    id: admin.id,
    username: admin.username,
    full_name: admin.full_name,
    email: admin.email,
    role: admin.role,
    token: access_token,
    exp: Date.now() + 8 * 60 * 60 * 1000,
  };

  const response = NextResponse.json({ ok: true, admin });
  response.cookies.set("admin_session", JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
