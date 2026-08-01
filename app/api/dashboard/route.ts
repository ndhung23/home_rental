import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "../../../db";
import { verifySessionToken } from "../../../lib/auth";

export const runtime = "nodejs";

export async function GET() {
  if (!verifySessionToken((await cookies()).get("hm_session")?.value)) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  try {
    const [summary, revenue] = await Promise.all([
      db.query(`
        select
          coalesce(sum(i.total_amount), 0)::bigint billed,
          coalesce(sum(i.total_amount) filter (where i.status = 'paid'), 0)::bigint paid,
          coalesce(sum(i.total_amount) filter (where i.status <> 'paid'), 0)::bigint debt
        from invoices i
        where i.period = date_trunc('month', current_date)::date
      `),
      db.query(`
        with months as (
          select generate_series(
            date_trunc('month', current_date) - interval '5 months',
            date_trunc('month', current_date),
            interval '1 month'
          )::date period
        )
        select to_char(m.period, 'YYYY-MM') period,
          coalesce(sum(i.total_amount), 0)::bigint billed,
          coalesce(sum(i.total_amount) filter (where i.status = 'paid'), 0)::bigint paid
        from months m
        left join invoices i on i.period = m.period
        group by m.period order by m.period
      `),
    ]);
    return NextResponse.json({
      summary: summary.rows[0],
      revenue: revenue.rows,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tải doanh thu" }, { status: 500 });
  }
}
