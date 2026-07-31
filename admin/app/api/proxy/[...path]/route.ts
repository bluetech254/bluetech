import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BASE = process.env.NEXT_PUBLIC_API_URL!;

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const cookieStore = cookies();
  let token = "";
  try {
    const raw = cookieStore.get("admin_session")?.value;
    if (raw) token = JSON.parse(raw).token ?? "";
  } catch {
    // malformed cookie — proceed without token; backend will reject
  }

  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  try {
    const path = params.path.join("/");
    const url = `${BASE}/api/v1/${path}${req.nextUrl.search}`;
    const body = ["GET", "HEAD"].includes(req.method) ? undefined : await req.text();

    const res = await fetch(url, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ detail: "Proxy error" }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
