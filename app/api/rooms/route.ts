import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "../../../db";
import { verifySessionToken } from "../../../lib/auth";

export const runtime = "nodejs";

export async function GET() {
  if (!verifySessionToken((await cookies()).get("hm_session")?.value)) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  try {
    const result = await db.query(`
      select code, tenant_name, tenant_phone, monthly_rent, status, payment_note
      from rooms
      order by code
    `);
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: "Không thể kết nối PostgreSQL" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!verifySessionToken((await cookies()).get("hm_session")?.value)) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  try {
    const { code, monthlyRent } = await request.json();
    if (!code || !Number.isFinite(monthlyRent) || monthlyRent <= 0) {
      return NextResponse.json({ error: "Thông tin phòng không hợp lệ" }, { status: 400 });
    }

    const result = await db.query(
      `insert into rooms (organization_id, property_id, code, monthly_rent, status, payment_note)
       values (
         (select id from organizations order by created_at limit 1),
         (select id from properties order by created_at limit 1),
         $1, $2, 'vacant', 'Phòng mới'
       )
       returning code, tenant_name, tenant_phone, monthly_rent, status, payment_note`,
      [String(code).trim().toUpperCase(), monthlyRent],
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    const message = error instanceof Error && "code" in error && error.code === "23505"
      ? "Mã phòng đã tồn tại"
      : "Không thể thêm phòng";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
