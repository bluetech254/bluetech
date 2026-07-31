import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

function getToken(req: NextRequest): string | null {
  try {
    const raw = req.cookies.get("admin_session")?.value;
    return raw ? JSON.parse(raw).token ?? null : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });

  const res = await fetch(`${BASE}/api/v1/admin/auth/list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
