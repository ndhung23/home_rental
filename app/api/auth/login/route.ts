import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { createSessionToken } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { username, password } = await request.json();
  const result = await db.query(
    `select id, username, display_name, role
     from app_users
     where username = $1 and password_hash = crypt($2, password_hash) and is_active = true`,
    [String(username || "").trim(), String(password || "")],
  );

  if (!result.rowCount) {
    return NextResponse.json({ error: "Tên đăng nhập hoặc mật khẩu không đúng" }, { status: 401 });
  }

  const user = result.rows[0];
  const token = createSessionToken({
    userId: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("hm_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}
