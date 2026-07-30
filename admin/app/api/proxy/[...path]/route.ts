import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BASE = process.env.NEXT_PUBLIC_API_URL!;

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const cookieStore = cookies();
    let token = "";
    try {
      const raw = cookieStore.get("admin_session")?.value;
      if (raw) {
        const parsed = JSON.parse(raw);
        token = parsed.token ?? "";
      }
    } catch (e) {
      console.error("[proxy cookie parse error]", e);
    }

    const path = params.path.join("/");
    const search = req.nextUrl.search;
    const url = `${BASE}/api/v1/${path}${search}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const body = ["GET", "HEAD"].includes(req.method) ? undefined : await req.text();

    const res = await fetch(url, { method: req.method, headers, body });
    const text = await res.text();
    if (!res.ok) console.error(`[proxy] ${req.method} ${url} → ${res.status}`, text.slice(0, 200));

    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (err: any) {
    console.error("[proxy error]", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
