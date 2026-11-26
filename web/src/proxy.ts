import { NextResponse, type NextRequest } from "next/server";

// CORS for the JSON API so the shopkeeper app (and its web preview) can call it.
// Auth is a bearer token, not cookies, so allowing any origin is safe here.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function proxy(req: NextRequest) {
  if (req.method === "OPTIONS") return new NextResponse(null, { status: 204, headers: CORS });
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
  return res;
}

export const config = { matcher: ["/api/:path*", "/uploads/:path*"] };
