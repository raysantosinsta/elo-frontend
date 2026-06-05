import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_NESTJS_API_URL || "http://localhost:3000";

export async function GET() {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    const isOnline = response.ok && data?.status === "ok";

    return NextResponse.json(
      {
        status: isOnline ? "ok" : "offline",
        backend: data,
      },
      { status: isOnline ? 200 : 502 },
    );
  } catch {
    return NextResponse.json({ status: "offline" }, { status: 503 });
  }
}
