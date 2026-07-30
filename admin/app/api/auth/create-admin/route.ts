import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function POST(req: NextRequest) {
  const raw = req.cookies.get("admin_session")?.value;
  if (!raw) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  const session = JSON.parse(raw);
  const body = await req.json();

  const res = await fetch(`${BASE}/api/v1/admin/auth/create-admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
