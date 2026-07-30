import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BASE = process.env.NEXT_PUBLIC_API_URL!;

function getToken(): string {
  try {
    const raw = cookies().get("admin_session")?.value;
    return raw ? JSON.parse(decodeURIComponent(raw)).token ?? "" : "";
  } catch {
    return "";
  }
}

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const search = req.nextUrl.search;
  const url = `${BASE}/api/v1/${path}${search}`;
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const body = ["GET", "HEAD"].includes(req.method) ? undefined : await req.text();

  const res = await fetch(url, { method: req.method, headers, body });
  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
