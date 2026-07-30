import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;
  if (!cookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let token: string;
  try {
    token = JSON.parse(cookie).token;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/auth/list`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
