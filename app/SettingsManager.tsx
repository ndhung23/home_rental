"use client";

import { FormEvent, useEffect, useState } from "react";

type PriceCode = "electricity" | "water" | "internet" | "trash";
type Prices = Record<PriceCode, number>;
type Property = { id: string; name: string; address: string };

const fields: Array<{ code: PriceCode; label: string; description: string; unit: string; icon: string }> = [
  { code: "electricity", label: "Giá điện", description: "Tính theo lượng điện tiêu thụ của phòng", unit: "đ / kWh", icon: "ϟ" },
  { code: "water", label: "Giá nước", description: "Tính theo lượng nước tiêu thụ của phòng", unit: "đ / m³", icon: "◉" },
  { code: "internet", label: "Phí Internet", description: "Khoản phí cố định hàng tháng", unit: "đ / tháng", icon: "⌁" },
  { code: "trash", label: "Phí dịch vụ, rác", description: "Khoản phí vệ sinh và dịch vụ hàng tháng", unit: "đ / tháng", icon: "▤" },
];

export function SettingsManager() {
  const [prices, setPrices] = useState<Prices>({ electricity: 0, water: 0, internet: 0, trash: 0 });
  const [paymentDueDay, setPaymentDueDay] = useState(10);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadSettings = (selectedPropertyId?: string) => {
    setLoading(true);
    setError("");
    fetch(`/api/settings${selectedPropertyId ? `?propertyId=${selectedPropertyId}` : ""}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setProperties(result.properties || []);
        setPropertyId(result.propertyId || "");
        setPrices(result.prices);
        setPaymentDueDay(result.paymentDueDay);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Không thể tải cài đặt"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSettings(); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, paymentDueDay, prices }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể lưu cài đặt");
      setNotice("Đã lưu cài đặt thu tiền");
      window.setTimeout(() => setNotice(""), 3000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể lưu cài đặt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="settings-page" onSubmit={submit}>
      <section className="settings-hero">
        <div><p className="eyebrow">THIẾT LẬP CHỦ TRỌ</p><h2>Cài đặt thu tiền</h2><p>Mỗi nhà trọ có đơn giá và ngày thanh toán riêng.</p></div>
        <button className="settings-save" type="submit" disabled={loading || saving}>{saving ? "Đang lưu..." : "✓ Lưu thay đổi"}</button>
      </section>
      <section className="property-setting-picker">
        <div><span className="property-picker-icon">▥</span><p><strong>Đang cài đặt cho nhà trọ</strong><small>Chọn nhà trọ cần thay đổi bảng giá</small></p></div>
        <select value={propertyId} disabled={loading} onChange={(event) => loadSettings(event.target.value)}>
          {properties.map((item) => <option value={item.id} key={item.id}>{item.name} — {item.address}</option>)}
        </select>
      </section>
      {error && <div className="billing-error settings-error">{error}</div>}
      <div className="settings-layout">
        <section className="panel settings-panel">
          <div className="settings-heading"><div><p className="eyebrow">ĐƠN GIÁ DỊCH VỤ</p><h3>Giá áp dụng hàng tháng</h3></div><span>Đơn vị: Việt Nam đồng</span></div>
          <div className="price-list">
            {fields.map((field) => <label className="price-row" key={field.code}>
              <span className="price-icon">{field.icon}</span>
              <span className="price-copy"><strong>{field.label}</strong><small>{field.description}</small></span>
              <span className="money-input"><input type="number" min="0" step="500" disabled={loading} value={prices[field.code]} onChange={(event) => setPrices((current) => ({ ...current, [field.code]: Number(event.target.value) }))} /><b>{field.unit}</b></span>
            </label>)}
          </div>
        </section>
        <aside className="panel due-settings">
          <span className="due-icon">▣</span>
          <p className="eyebrow">HẠN THANH TOÁN</p>
          <h3>Ngày thu tiền hàng tháng</h3>
          <p>Hóa đơn mới sẽ tự động dùng ngày này làm hạn thanh toán.</p>
          <label><span>Ngày</span><input type="number" min="1" max="28" disabled={loading} value={paymentDueDay} onChange={(event) => setPaymentDueDay(Number(event.target.value))} /><b>hàng tháng</b></label>
          <div className="due-preview"><span>Ví dụ kỳ tháng 08/2026</span><strong>Hạn thanh toán: {String(paymentDueDay).padStart(2, "0")}/08/2026</strong></div>
          <small>Chọn từ ngày 1–28 để áp dụng được cho mọi tháng.</small>
        </aside>
      </div>
      <div className="settings-note"><span>i</span><p><strong>Áp dụng cho hóa đơn mới</strong><small>Thay đổi đơn giá không làm thay đổi các hóa đơn đã tạo trước đó.</small></p></div>
      {notice && <div className="toast"><span>✓</span>{notice}</div>}
    </form>
  );
}
