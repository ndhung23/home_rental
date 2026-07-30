import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "../../../db";
import { verifySessionToken } from "../../../lib/auth";

export const runtime = "nodejs";
const organizationSql = "(select id from organizations order by created_at limit 1)";

const session = async () => verifySessionToken((await cookies()).get("hm_session")?.value);

export async function GET(request: Request) {
  if (!(await session())) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  try {
    const propertyId = new URL(request.url).searchParams.get("propertyId");
    const properties = await db.query(`select id, name, address from properties where organization_id = ${organizationSql} order by name`);
    const selectedId = propertyId || properties.rows[0]?.id;
    if (!selectedId) return NextResponse.json({ properties: [], propertyId: null, paymentDueDay: 10, prices: {} });
    const settings = await db.query(`
      select electricity_price, water_price, internet_price, trash_price, payment_due_day
      from property_billing_settings where property_id = $1
    `, [selectedId]);
    const row = settings.rows[0] || {};
    return NextResponse.json({
      properties: properties.rows,
      propertyId: selectedId,
      paymentDueDay: Number(row.payment_due_day || 10),
      prices: {
        electricity: Number(row.electricity_price || 3500),
        water: Number(row.water_price || 15000),
        internet: Number(row.internet_price || 100000),
        trash: Number(row.trash_price || 30000),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tải cài đặt" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await session();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "landlord") return NextResponse.json({ error: "Chỉ chủ trọ được thay đổi cài đặt" }, { status: 403 });
  const client = await db.connect();
  try {
    const { propertyId, paymentDueDay, prices } = await request.json();
    const ownsProperty = await client.query(`select id from properties where id = $1 and organization_id = ${organizationSql}`, [propertyId]);
    if (!ownsProperty.rowCount) throw new Error("Nhà trọ không hợp lệ");
    const dueDay = Number(paymentDueDay);
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) throw new Error("Ngày thanh toán phải từ ngày 1 đến ngày 28");
    for (const code of ["electricity", "water", "internet", "trash"]) {
      if (!Number.isFinite(Number(prices?.[code])) || Number(prices[code]) < 0) throw new Error("Đơn giá không hợp lệ");
    }
    await client.query("begin");
    await client.query(`
      insert into property_billing_settings
        (property_id, electricity_price, water_price, internet_price, trash_price, payment_due_day)
      values ($1,$2,$3,$4,$5,$6)
      on conflict (property_id) do update set
        electricity_price = excluded.electricity_price, water_price = excluded.water_price,
        internet_price = excluded.internet_price, trash_price = excluded.trash_price,
        payment_due_day = excluded.payment_due_day, updated_at = now()
    `, [propertyId, Math.round(Number(prices.electricity)), Math.round(Number(prices.water)), Math.round(Number(prices.internet)), Math.round(Number(prices.trash)), dueDay]);
    await client.query("commit");
    return NextResponse.json({ ok: true });
  } catch (error) {
    await client.query("rollback");
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể lưu cài đặt" }, { status: 400 });
  } finally {
    client.release();
  }
}
