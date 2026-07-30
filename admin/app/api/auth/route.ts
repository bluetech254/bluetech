import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const backendRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }
  );

  if (!backendRes.ok) {
    const data = await backendRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: data.detail ?? "Invalid credentials" },
      { status: 401 }
    );
  }

  const { access_token, admin } = await backendRes.json();

  const session = {
    id: admin.id,
    username: admin.username,
    full_name: admin.full_name,
    email: admin.email,
    role: admin.role,
    token: access_token,
    exp: Date.now() + 8 * 60 * 60 * 1000,
  };

  const res = NextResponse.json({ ok: true, role: admin.role });
  res.cookies.set("admin_session", JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}
