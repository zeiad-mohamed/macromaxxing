// GET /api/auth/me — the signed-in user, or 401.
import { userFromRequest } from "@/lib/server/auth.js";
import { NextResponse } from "next/server";

export async function GET(request) {
  const user = userFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  return NextResponse.json({ user });
}
