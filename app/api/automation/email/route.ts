import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySessionToken } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = verifySessionToken((await cookies()).get("hm_session")?.value);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { to, subject, html } = await request.json();
  if (!to || !subject || !html) return NextResponse.json({ error: "Thiếu nội dung email" }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return NextResponse.json({ ok: true, mode: "mock", message: "Đã ghi nhận email thử nghiệm. Thêm RESEND_API_KEY và EMAIL_FROM để gửi thật." });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  const result = await response.json();
  if (!response.ok) return NextResponse.json({ error: result.message || "Không thể gửi email" }, { status: 502 });
  return NextResponse.json({ ok: true, mode: "live", id: result.id });
}
