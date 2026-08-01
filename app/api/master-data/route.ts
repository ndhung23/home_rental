import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "../../../db";
import { verifySessionToken } from "../../../lib/auth";

export const runtime = "nodejs";

const organizationSql = "(select id from organizations order by created_at limit 1)";

export async function GET() {
  if (!verifySessionToken((await cookies()).get("hm_session")?.value)) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  try {
    const [properties, rooms, tenants] = await Promise.all([
      db.query(`
        select p.id, p.name, p.address, p.manager_name, p.manager_phone,
          count(r.id)::int as room_count,
          count(r.id) filter (where r.status = 'occupied')::int as occupied_count
        from properties p left join rooms r on r.property_id = p.id
        group by p.id order by p.created_at
      `),
      db.query(`
        select r.id, r.code, r.floor, r.area_sqm, r.monthly_rent, r.status,
          p.id as property_id, p.name as property_name
        from rooms r left join properties p on p.id = r.property_id
        order by p.name, r.code
      `),
      db.query(`
        select t.id, t.full_name, t.phone, t.email, t.identity_number, t.gender, t.date_of_birth, t.status,
          r.code as room_code, p.name as property_name
        from tenants t
        left join leases l on l.tenant_id = t.id and l.status = 'active'
        left join rooms r on r.id = l.room_id
        left join properties p on p.id = r.property_id
        order by t.full_name
      `),
    ]);
    return NextResponse.json({
      properties: properties.rows,
      rooms: rooms.rows,
      tenants: tenants.rows,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!verifySessionToken((await cookies()).get("hm_session")?.value)) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const client = await db.connect();
  try {
    const body = await request.json();
    await client.query("begin");

    if (body.type === "property") {
      await client.query(
        `insert into properties (organization_id, name, address, manager_name, manager_phone)
         values (${organizationSql}, $1, $2, $3, $4)`,
        [body.name, body.address, body.managerName || null, body.managerPhone || null],
      );
    } else if (body.type === "room") {
      await client.query(
        `insert into rooms (organization_id, property_id, code, floor, area_sqm, monthly_rent, status, payment_note)
         values (${organizationSql}, $1, $2, $3, $4, $5, 'vacant', 'Phòng mới')`,
        [body.propertyId, body.code, body.floor || null, body.area || null, body.monthlyRent],
      );
    } else if (body.type === "tenant") {
      const tenant = await client.query(
        `insert into tenants (organization_id, full_name, phone, email, identity_number, gender, date_of_birth)
         values (${organizationSql}, $1, $2, $3, $4, $5, $6) returning id`,
        [body.fullName, body.phone, body.email || null, body.identityNumber || null, body.gender || null, body.dateOfBirth || null],
      );
      if (body.roomId) {
        await client.query(
          `insert into leases (organization_id, room_id, tenant_id, start_date, deposit, status)
           values (${organizationSql}, $1, $2, current_date, $3, 'active')`,
          [body.roomId, tenant.rows[0].id, body.deposit || 0],
        );
        await client.query(
          `update rooms set status = 'occupied', tenant_name = $1, tenant_phone = $2 where id = $3`,
          [body.fullName, body.phone, body.roomId],
        );
      }
    } else {
      throw new Error("Loại dữ liệu không hợp lệ");
    }

    await client.query("commit");
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    await client.query("rollback");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể lưu dữ liệu" },
      { status: 400 },
    );
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  if (!verifySessionToken((await cookies()).get("hm_session")?.value)) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  try {
    const body = await request.json();
    if (body.type === "property") {
      await db.query(
        `update properties set name = $1, address = $2, manager_name = $3, manager_phone = $4 where id = $5`,
        [body.name, body.address, body.managerName || null, body.managerPhone || null, body.id],
      );
    } else if (body.type === "room") {
      await db.query(
        `update rooms set property_id = $1, code = $2, floor = $3, area_sqm = $4, monthly_rent = $5, status = $6 where id = $7`,
        [body.propertyId, body.code, body.floor || null, body.area || null, body.monthlyRent, body.status || "vacant", body.id],
      );
    } else if (body.type === "tenant") {
      await db.query(
        `update tenants set full_name = $1, phone = $2, email = $3, identity_number = $4, gender = $5, date_of_birth = $6, status = $7 where id = $8`,
        [body.fullName, body.phone, body.email || null, body.identityNumber || null, body.gender || null, body.dateOfBirth || null, body.status || "active", body.id],
      );
    } else {
      throw new Error("Loại dữ liệu không hợp lệ");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể cập nhật" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!verifySessionToken((await cookies()).get("hm_session")?.value)) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    if (!id) throw new Error("Thiếu mã dữ liệu");
    const table = type === "property" ? "properties" : type === "room" ? "rooms" : type === "tenant" ? "tenants" : null;
    if (!table) throw new Error("Loại dữ liệu không hợp lệ");
    await db.query(`delete from ${table} where id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error && error.message.includes("foreign key")
        ? "Không thể xóa vì dữ liệu đang được sử dụng"
        : error instanceof Error ? error.message : "Không thể xóa dữ liệu",
    }, { status: 400 });
  }
}
