"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Service = {
  code: string;
  name: string;
  unit: string;
  unit_price: number;
  calculation_type: "metered" | "fixed";
};

type BillingRoom = {
  id: string;
  code: string;
  property_id: string;
  property_name: string;
  tenant_name: string;
  monthly_rent: number;
  invoice_id: string | null;
  total_amount: number | null;
  service_amount: number | null;
  invoice_status: "unpaid" | "paid" | "overdue" | null;
  electricity_previous: number;
  electricity_current: number;
  water_previous: number;
  water_current: number;
  electricity_price: number;
  water_price: number;
  internet_price: number;
  trash_price: number;
  payment_due_day: number;
};

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

const currentPeriod = () => new Date().toISOString().slice(0, 7);
const defaultDueDate = () => `${currentPeriod()}-10`;

export function BillingManager() {
  const [period, setPeriod] = useState(currentPeriod);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [services, setServices] = useState<Service[]>([]);
  const [rooms, setRooms] = useState<BillingRoom[]>([]);
  const [query, setQuery] = useState("");
  const [property, setProperty] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/billing?period=${period}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể tải dữ liệu thu tiền");
      setServices(result.services);
      setDueDate(`${period}-${String(result.paymentDueDay || 10).padStart(2, "0")}`);
      setRooms(result.rooms.map((room: BillingRoom) => ({
        ...room,
        monthly_rent: Number(room.monthly_rent),
        total_amount: room.total_amount === null ? null : Number(room.total_amount),
        service_amount: room.service_amount === null ? null : Number(room.service_amount),
        electricity_previous: Number(room.electricity_previous),
        electricity_current: Number(room.electricity_current),
        water_previous: Number(room.water_previous),
        water_current: Number(room.water_current),
        electricity_price: Number(room.electricity_price),
        water_price: Number(room.water_price),
        internet_price: Number(room.internet_price),
        trash_price: Number(room.trash_price),
        payment_due_day: Number(room.payment_due_day),
      })));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { void load(); }, [load]);

  const price = (code: string) => Number(services.find((service) => service.code === code)?.unit_price || 0);
  const fixedTotal = useMemo(
    () => services.filter((service) => service.calculation_type === "fixed").reduce((sum, service) => sum + Number(service.unit_price), 0),
    [services],
  );
  const roomTotal = (room: BillingRoom) =>
    room.invoice_id
      ? Number(room.total_amount)
      : room.monthly_rent +
        Math.max(0, room.electricity_current - room.electricity_previous) * room.electricity_price +
        Math.max(0, room.water_current - room.water_previous) * room.water_price +
        room.internet_price + room.trash_price;

  const properties = useMemo(
    () => Array.from(new Map(rooms.map((room) => [room.property_id, room.property_name])).entries()),
    [rooms],
  );
  const filtered = rooms.filter((room) =>
    (property === "all" || room.property_id === property) &&
    (status === "all" || (status === "not_created" ? !room.invoice_id : room.invoice_status === status)) &&
    `${room.code} ${room.tenant_name} ${room.property_name}`.toLowerCase().includes(query.toLowerCase()),
  );
  const total = rooms.reduce((sum, room) => sum + (room.invoice_id ? Number(room.total_amount) : 0), 0);
  const paid = rooms.reduce((sum, room) => sum + (room.invoice_status === "paid" ? Number(room.total_amount) : 0), 0);
  const debt = total - paid;

  const updateReading = (id: string, field: "electricity_current" | "water_current", value: string) => {
    setRooms((current) => current.map((room) => room.id === id ? { ...room, [field]: Number(value) } : room));
  };

  const generateInvoices = async () => {
    if (!rooms.length) return;
    const invalid = rooms.find((room) =>
      room.electricity_current < room.electricity_previous || room.water_current < room.water_previous);
    if (invalid) {
      setError(`Chỉ số mới của phòng ${invalid.code} phải lớn hơn hoặc bằng chỉ số cũ.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          dueDate,
          rooms: rooms.map((room) => ({
            id: room.id,
            code: room.code,
            monthlyRent: room.monthly_rent,
            electricityPrevious: room.electricity_previous,
            electricityCurrent: room.electricity_current,
            waterPrevious: room.water_previous,
            waterCurrent: room.water_current,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể tạo hóa đơn");
      setNotice(`Đã tạo hóa đơn tháng ${period.slice(5)}/${period.slice(0, 4)} cho ${result.count} phòng`);
      window.setTimeout(() => setNotice(""), 3000);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tạo hóa đơn");
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (invoiceId: string) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/billing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, method: "cash" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể ghi nhận thanh toán");
      setNotice("Đã ghi nhận thanh toán thành công");
      window.setTimeout(() => setNotice(""), 3000);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể ghi nhận thanh toán");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="billing-page">
      <section className="billing-hero">
        <div>
          <p className="eyebrow">QUẢN LÝ DÒNG TIỀN</p>
          <h2>Thu tiền hàng tháng</h2>
          <p>Nhập chỉ số, tính tiền và theo dõi thanh toán từng phòng.</p>
        </div>
        <div className="billing-period">
          <label>Kỳ thu<input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /></label>
          <label>Hạn thanh toán<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          <button className="billing-generate" onClick={generateInvoices} disabled={saving || loading}>
            {saving ? "Đang xử lý..." : "＋ Tạo hóa đơn tháng"}
          </button>
        </div>
      </section>

      <section className="billing-summary">
        <article><span>TỔNG PHẢI THU</span><strong>{money(total)}</strong><small>{rooms.filter((room) => room.invoice_id).length} hóa đơn đã tạo</small></article>
        <article><span>ĐÃ THU</span><strong className="paid-value">{money(paid)}</strong><small>{rooms.filter((room) => room.invoice_status === "paid").length} phòng đã thanh toán</small></article>
        <article><span>CÒN PHẢI THU</span><strong className="debt-value">{money(debt)}</strong><small>{rooms.filter((room) => room.invoice_id && room.invoice_status !== "paid").length} hóa đơn chưa thu</small></article>
        <article><span>PHÒNG ĐANG THUÊ</span><strong>{rooms.length}</strong><small>Cần chốt chỉ số trong kỳ</small></article>
      </section>

      <section className="panel billing-panel">
        <div className="billing-toolbar">
          <div><h3>Bảng tính tiền tháng {period.slice(5)}/{period.slice(0, 4)}</h3><span>Đơn giá: điện {money(price("electricity"))}/kWh · nước {money(price("water"))}/m³</span></div>
          <div className="billing-filters">
            <label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm phòng, người thuê..." /></label>
            <select value={property} onChange={(event) => setProperty(event.target.value)}><option value="all">Tất cả nhà trọ</option>{properties.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select>
            <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Mọi trạng thái</option><option value="not_created">Chưa tạo HĐ</option><option value="unpaid">Chưa thu</option><option value="paid">Đã thu</option></select>
          </div>
        </div>
        {error && <div className="billing-error">{error}</div>}
        {loading ? <div className="billing-empty">Đang tải dữ liệu thu tiền...</div> : !rooms.length ? (
          <div className="billing-empty"><span>₫</span><h3>Chưa có phòng đang thuê</h3><p>Hãy gán người thuê cho phòng trước khi tạo hóa đơn tháng.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="billing-table">
              <thead><tr><th>PHÒNG / NGƯỜI THUÊ</th><th>TIỀN PHÒNG</th><th>CHỈ SỐ ĐIỆN</th><th>CHỈ SỐ NƯỚC</th><th>DỊCH VỤ</th><th>TỔNG CỘNG</th><th>TRẠNG THÁI</th><th /></tr></thead>
              <tbody>{filtered.map((room) => {
                const electricityUsage = Math.max(0, room.electricity_current - room.electricity_previous);
                const waterUsage = Math.max(0, room.water_current - room.water_previous);
                return <tr key={room.id}>
                  <td><strong className="room-number">{room.code}</strong><small>{room.tenant_name} · {room.property_name}</small></td>
                  <td><strong>{money(room.monthly_rent)}</strong><small>Cố định / tháng</small></td>
                  <td><div className="meter-inputs"><input type="number" value={room.electricity_previous} disabled /><span>→</span><input type="number" min={room.electricity_previous} value={room.electricity_current} disabled={!!room.invoice_id} onChange={(event) => updateReading(room.id, "electricity_current", event.target.value)} /></div><small>{electricityUsage} kWh · {money(electricityUsage * room.electricity_price)}</small></td>
                  <td><div className="meter-inputs"><input type="number" value={room.water_previous} disabled /><span>→</span><input type="number" min={room.water_previous} value={room.water_current} disabled={!!room.invoice_id} onChange={(event) => updateReading(room.id, "water_current", event.target.value)} /></div><small>{waterUsage} m³ · {money(waterUsage * room.water_price)}</small></td>
                  <td><strong>{money(room.internet_price + room.trash_price)}</strong><small>Internet + rác</small></td>
                  <td><strong className="billing-total">{money(roomTotal(room))}</strong><small>{room.invoice_id ? "Đã chốt hóa đơn" : "Tạm tính"}</small></td>
                  <td><span className={`invoice-status ${room.invoice_status || "draft"}`}>{room.invoice_status === "paid" ? "Đã thu" : room.invoice_id ? "Chưa thu" : "Chưa tạo"}</span></td>
                  <td>{room.invoice_id && room.invoice_status !== "paid" ? <button className="collect-button" disabled={saving} onClick={() => markPaid(room.invoice_id!)}>Đã thu tiền</button> : room.invoice_status === "paid" ? <span className="paid-check">✓</span> : null}</td>
                </tr>;
              })}</tbody>
            </table>
            {!filtered.length && <div className="billing-empty">Không có dữ liệu phù hợp bộ lọc.</div>}
          </div>
        )}
      </section>
      {notice && <div className="toast"><span>✓</span>{notice}</div>}
    </div>
  );
}
