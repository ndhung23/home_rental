import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "../../../db";
import { verifySessionToken } from "../../../lib/auth";

export const runtime = "nodejs";
const organizationSql = "(select id from organizations order by created_at limit 1)";
const kinds = new Set(["meter", "invoice", "cashflow", "vehicle", "asset", "service", "maintenance", "task", "notification", "report"]);
const statuses = new Set(["new", "processing", "completed"]);
const authenticated = async () => verifySessionToken((await cookies()).get("hm_session")?.value);

export async function GET(request: Request) {
  if (!(await authenticated())) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  try {
    const url = new URL(request.url); const kind = url.searchParams.get("kind");
    if (!kind || !kinds.has(kind)) return NextResponse.json({ error: "Loại nghiệp vụ không hợp lệ" }, { status: 400 });
    const result = await db.query(`select o.id, o.code, o.title, o.detail, o.assignee, to_char(o.due_date,'DD/MM/YYYY') due, o.status, o.email, o.amount, o.property_id, o.room_id, p.name property_name, r.code room_code from operations o left join properties p on p.id=o.property_id left join rooms r on r.id=o.room_id where o.organization_id=${organizationSql} and o.kind=$1 order by o.created_at desc`, [kind]);
    return NextResponse.json({ items: result.rows });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tải dữ liệu" }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!(await authenticated())) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  try {
    const body = await request.json(); if (!kinds.has(body.kind) || !body.title) throw new Error("Dữ liệu không hợp lệ");
    const code = `${String(body.kind).slice(0,3).toUpperCase()}-${Date.now().toString().slice(-7)}`;
    const result = await db.query(`insert into operations (organization_id,kind,code,title,detail,assignee,due_date,status,email,amount,property_id,room_id) values (${organizationSql},$1,$2,$3,$4,$5,$6,'new',$7,$8,$9,$10) returning id,code`, [body.kind, code, body.title, body.detail || "", body.assignee || "", body.dueDate || null, body.email || null, Number(body.amount || 0), body.propertyId || null, body.roomId || null]);
    return NextResponse.json({ ok: true, ...result.rows[0] }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tạo dữ liệu" }, { status: 400 }); }
}

export async function PUT(request: Request) {
  if (!(await authenticated())) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  try { const body = await request.json(); if (!body.id || !statuses.has(body.status)) throw new Error("Trạng thái không hợp lệ"); await db.query(`update operations set status=$1,updated_at=now() where id=$2 and organization_id=${organizationSql}`, [body.status, body.id]); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể cập nhật" }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  if (!(await authenticated())) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  try { const id = new URL(request.url).searchParams.get("id"); if (!id) throw new Error("Thiếu mã dữ liệu"); await db.query(`delete from operations where id=$1 and organization_id=${organizationSql}`, [id]); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể xóa" }, { status: 400 }); }
}
