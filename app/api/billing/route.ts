import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "../../../db";
import { verifySessionToken } from "../../../lib/auth";

export const runtime = "nodejs";

const unauthorized = async () => !verifySessionToken((await cookies()).get("hm_session")?.value);

export async function GET(request: Request) {
  if (await unauthorized()) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const period = new URL(request.url).searchParams.get("period") || new Date().toISOString().slice(0, 7);
  try {
    const [services, rooms, settings] = await Promise.all([
      db.query(`select id, code, name, unit, unit_price, calculation_type from services where is_active order by code`),
      db.query(`
        select r.id, r.code, r.monthly_rent, r.property_id, p.name property_name,
          coalesce(t.full_name, r.tenant_name, 'Chưa cập nhật') tenant_name,
          i.id invoice_id, i.total_amount, i.service_amount, i.status invoice_status,
          coalesce(er.reminder_count, 0)::int reminder_count,
          coalesce(e.previous_value, pe.current_value, 0) electricity_previous,
          coalesce(e.current_value, pe.current_value, 0) electricity_current,
          coalesce(w.previous_value, pw.current_value, 0) water_previous,
          coalesce(w.current_value, pw.current_value, 0) water_current
          ,coalesce(pbs.electricity_price, 3500) electricity_price
          ,coalesce(pbs.water_price, 15000) water_price
          ,coalesce(pbs.internet_price, 100000) internet_price
          ,coalesce(pbs.trash_price, 30000) trash_price
          ,coalesce(pbs.payment_due_day, 10) payment_due_day
        from rooms r
        join properties p on p.id = r.property_id
        left join property_billing_settings pbs on pbs.property_id = p.id
        left join leases l on l.room_id = r.id and l.status = 'active'
        left join tenants t on t.id = l.tenant_id
        left join invoices i on i.room_id = r.id and i.period = ($1 || '-01')::date
        left join lateral (
          select count(*)::int reminder_count
          from invoice_email_reminders
          where invoice_id = i.id and status = 'sent'
        ) er on true
        left join services es on es.organization_id = r.organization_id and es.code = 'electricity'
        left join services ws on ws.organization_id = r.organization_id and ws.code = 'water'
        left join meter_readings e on e.room_id = r.id and e.service_id = es.id and e.period = ($1 || '-01')::date
        left join meter_readings w on w.room_id = r.id and w.service_id = ws.id and w.period = ($1 || '-01')::date
        left join lateral (
          select current_value from meter_readings
          where room_id = r.id and service_id = es.id and period < ($1 || '-01')::date
          order by period desc limit 1
        ) pe on true
        left join lateral (
          select current_value from meter_readings
          where room_id = r.id and service_id = ws.id and period < ($1 || '-01')::date
          order by period desc limit 1
        ) pw on true
        where r.status in ('occupied', 'unpaid')
        order by p.name, r.code
      `, [period]),
      db.query(`select payment_due_day from billing_settings order by updated_at desc limit 1`),
    ]);
    return NextResponse.json({ services: services.rows, rooms: rooms.rows, paymentDueDay: Number(settings.rows[0]?.payment_due_day || 10) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tải dữ liệu" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (await unauthorized()) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const client = await db.connect();
  try {
    const { period, dueDate, rooms } = await request.json();
    await client.query("begin");
    const serviceResult = await client.query(`select id, code, name, unit_price, calculation_type from services where is_active`);
    const services = Object.fromEntries(serviceResult.rows.map((service) => [service.code, service]));
    const createdInvoices: { roomId: string; invoiceId: string }[] = [];

    for (const room of rooms) {
      const electricityUsage = Number(room.electricityCurrent) - Number(room.electricityPrevious);
      const waterUsage = Number(room.waterCurrent) - Number(room.waterPrevious);
      if (electricityUsage < 0 || waterUsage < 0) throw new Error(`Chỉ số mới của phòng ${room.code} không hợp lệ`);

      for (const [code, previous, current] of [
        ["electricity", room.electricityPrevious, room.electricityCurrent],
        ["water", room.waterPrevious, room.waterCurrent],
      ]) {
        await client.query(`
          insert into meter_readings (organization_id, room_id, service_id, period, previous_value, current_value)
          values ((select organization_id from rooms where id = $1), $1, $2, ($3 || '-01')::date, $4, $5)
          on conflict (room_id, service_id, period) do update
          set previous_value = excluded.previous_value, current_value = excluded.current_value
        `, [room.id, services[code].id, period, previous, current]);
      }

      const propertySettings = await client.query(`
        select coalesce(pbs.electricity_price,3500) electricity_price,
          coalesce(pbs.water_price,15000) water_price,
          coalesce(pbs.internet_price,100000) internet_price,
          coalesce(pbs.trash_price,30000) trash_price,
          coalesce(pbs.payment_due_day,10) payment_due_day
        from rooms r left join property_billing_settings pbs on pbs.property_id = r.property_id where r.id = $1
      `, [room.id]);
      const config = propertySettings.rows[0];
      const items = [
        { service: { ...services.electricity, unit_price: config.electricity_price }, description: "Tiền điện", quantity: electricityUsage },
        { service: { ...services.water, unit_price: config.water_price }, description: "Tiền nước", quantity: waterUsage },
        { service: { ...services.internet, unit_price: config.internet_price }, description: "Internet", quantity: 1 },
        { service: { ...services.trash, unit_price: config.trash_price }, description: "Phí dịch vụ, rác", quantity: 1 },
      ];
      const serviceAmount = items.reduce((sum, item) => sum + Math.round(item.quantity * Number(item.service.unit_price)), 0);
      const rentAmount = Number(room.monthlyRent);
      const invoice = await client.query(`
        insert into invoices (organization_id, room_id, period, due_date, rent_amount, service_amount, total_amount, status)
        values ((select organization_id from rooms where id = $1), $1, ($2 || '-01')::date, $3, $4, $5, $4 + $5, 'unpaid')
        on conflict (room_id, period) do update set
          due_date = excluded.due_date, rent_amount = excluded.rent_amount,
          service_amount = excluded.service_amount, total_amount = excluded.total_amount,
          status = case when invoices.status = 'paid' then 'paid' else 'unpaid' end, updated_at = now()
        returning id
      `, [room.id, period, `${period}-${String(config.payment_due_day).padStart(2, "0")}`, rentAmount, serviceAmount]);
      createdInvoices.push({ roomId: room.id, invoiceId: invoice.rows[0].id });
      await client.query(`delete from invoice_items where invoice_id = $1`, [invoice.rows[0].id]);
      await client.query(`insert into invoice_items (invoice_id, description, quantity, unit_price, amount) values ($1, 'Tiền phòng', 1, $2, $2)`, [invoice.rows[0].id, rentAmount]);
      for (const item of items) {
        await client.query(`insert into invoice_items (invoice_id, service_id, description, quantity, unit_price, amount) values ($1,$2,$3,$4,$5,$4*$5)`,
          [invoice.rows[0].id, item.service.id, item.description, item.quantity, item.service.unit_price]);
      }
    }
    await client.query("commit");
    return NextResponse.json({ ok: true, count: rooms.length, invoices: createdInvoices });
  } catch (error) {
    await client.query("rollback");
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tạo hóa đơn" }, { status: 400 });
  } finally {
    client.release();
  }
}

export async function PATCH(request: Request) {
  if (await unauthorized()) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const client = await db.connect();
  try {
    const { invoiceId, method = "cash" } = await request.json();
    await client.query("begin");
    const invoice = await client.query(`select organization_id, total_amount, status from invoices where id = $1 for update`, [invoiceId]);
    if (!invoice.rowCount) throw new Error("Không tìm thấy hóa đơn");
    if (invoice.rows[0].status === "paid") {
      await client.query("commit");
      return NextResponse.json({ ok: true, alreadyPaid: true });
    }
    await client.query(`insert into payments (organization_id, invoice_id, amount, payment_method) values ($1,$2,$3,$4)`,
      [invoice.rows[0].organization_id, invoiceId, invoice.rows[0].total_amount, method]);
    await client.query(`update invoices set status = 'paid', paid_at = now(), updated_at = now() where id = $1`, [invoiceId]);
    await client.query("commit");
    return NextResponse.json({ ok: true });
  } catch (error) {
    await client.query("rollback");
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể ghi nhận thanh toán" }, { status: 400 });
  } finally {
    client.release();
  }
}
