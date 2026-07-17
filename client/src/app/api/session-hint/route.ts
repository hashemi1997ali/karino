import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Response {
  return Response.json(
    { hasSession: request.cookies.has("refreshToken") },
    { headers: { "Cache-Control": "no-store" } },
  );
}
