"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

export type OperationMode = "Điện nước" | "Hóa đơn" | "Thu chi" | "Phương tiện" | "Tài sản" | "Dịch vụ" | "Bảo trì" | "Công việc" | "Thông báo" | "Báo cáo";
type Item = { id: string; code?: string; title: string; detail: string; assignee: string; due: string; status: "Mới" | "Đang xử lý" | "Hoàn thành"; email?: string };

const seed: Record<OperationMode, Item[]> = {
  "Điện nước": [{ id: "MTR-001", title: "Chốt chỉ số phòng P100", detail: "Điện 126 kWh · Nước 8 m³", assignee: "Tuấn Anh", due: "05/08/2026", status: "Mới" }],
  "Hóa đơn": [{ id: "INV-0826", title: "Hóa đơn tháng 08/2026", detail: "3.130.000 ₫ · Phòng P100", assignee: "Nguyễn Văn Thành", due: "10/08/2026", status: "Đang xử lý", email: "tenant@example.com" }],
  "Thu chi": [{ id: "RC-0001", title: "Thu tiền phòng P100", detail: "3.130.000 ₫ · Chuyển khoản", assignee: "Tuấn Anh", due: "01/08/2026", status: "Hoàn thành" }],
  "Phương tiện": [{ id: "PT-001", title: "Honda Vision · 29X1-123.45", detail: "Xe máy · Vị trí A01", assignee: "Nguyễn Văn Thành", due: "31/12/2026", status: "Đang xử lý" }],
  "Tài sản": [{ id: "TS-001", title: "Máy lạnh Daikin", detail: "Phòng P100 · Tình trạng tốt", assignee: "Tuấn Anh", due: "15/12/2026", status: "Đang xử lý" }],
  "Dịch vụ": [{ id: "DV-001", title: "Internet", detail: "100.000 ₫ / tháng · Phí cố định", assignee: "Toàn bộ phòng", due: "01/09/2026", status: "Đang xử lý" }],
  "Bảo trì": [{ id: "MT-003", title: "Kiểm tra máy bơm tầng 2", detail: "Ưu tiên trung bình · Nhà trọ An Nhiên", assignee: "Kỹ thuật", due: "07/08/2026", status: "Mới" }],
  "Công việc": [{ id: "TSK-012", title: "Đối soát tiền thuê", detail: "Kiểm tra các khoản chưa thanh toán", assignee: "Tuấn Anh", due: "09/08/2026", status: "Đang xử lý" }],
  "Thông báo": [{ id: "NTF-021", title: "Nhắc hạn thanh toán", detail: "Gửi email trước hạn 3 ngày", assignee: "Tự động", due: "07/08/2026", status: "Mới", email: "tenant@example.com" }],
  "Báo cáo": [{ id: "RPT-008", title: "Báo cáo vận hành tháng 08", detail: "Doanh thu, công nợ và tỷ lệ lấp đầy", assignee: "Hệ thống", due: "31/08/2026", status: "Mới" }],
};

const kindMap: Record<OperationMode, string> = { "Điện nước": "meter", "Hóa đơn": "invoice", "Thu chi": "cashflow", "Phương tiện": "vehicle", "Tài sản": "asset", "Dịch vụ": "service", "Bảo trì": "maintenance", "Công việc": "task", "Thông báo": "notification", "Báo cáo": "report" };
const statusFromApi: Record<string, Item["status"]> = { new: "Mới", processing: "Đang xử lý", completed: "Hoàn thành" };
const statusToApi: Record<Item["status"], string> = { "Mới": "new", "Đang xử lý": "processing", "Hoàn thành": "completed" };

export function OperationsManager({ mode }: { mode: OperationMode }) {
  const [items, setItems] = useState<Item[]>(seed[mode]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Tất cả");
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [serverAvailable, setServerAvailable] = useState(false);
  useEffect(() => {
    fetch(`/api/operations?kind=${kindMap[mode]}`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("fallback"); const data = await response.json();
      setItems(data.items.map((item: Item & { code: string }) => ({ ...item, status: statusFromApi[item.status] || item.status })));
      setServerAvailable(true);
    }).catch(() => { const saved = localStorage.getItem(`hm-operations-${mode}`); setItems(saved ? JSON.parse(saved) : seed[mode]); setServerAvailable(false); });
  }, [mode]);
  const save = (next: Item[]) => { setItems(next); localStorage.setItem(`hm-operations-${mode}`, JSON.stringify(next)); };
  const filtered = useMemo(() => items.filter((item) => (status === "Tất cả" || item.status === status) && `${item.title} ${item.detail} ${item.assignee}`.toLowerCase().includes(query.toLowerCase())), [items, query, status]);
  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const draft = { id: `${mode.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`, title: String(data.get("title")), detail: String(data.get("detail")), assignee: String(data.get("assignee")), due: String(data.get("due")), status: "Mới" as const, email: String(data.get("email") || "") };
    if (serverAvailable) { const response = await fetch("/api/operations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: kindMap[mode], title: draft.title, detail: draft.detail, assignee: draft.assignee, dueDate: draft.due, email: draft.email }) }); const result = await response.json(); if (!response.ok) return setNotice(result.error || "Không thể tạo bản ghi"); draft.id = result.id; }
    save([draft, ...items]);
    setOpen(false); setNotice("Đã tạo bản ghi mới"); setTimeout(() => setNotice(""), 2500);
  };
  const sendEmail = async (item: Item) => {
    if (!item.email) return setNotice("Hãy thêm email khi tạo bản ghi");
    const response = await fetch("/api/automation/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: item.email, subject: `[Nhà Trọ 365] ${item.title}`, html: `<h2>${item.title}</h2><p>${item.detail}</p><p>Hạn: ${item.due}</p>` }) });
    const result = await response.json(); setNotice(response.ok ? result.message || "Đã gửi email" : result.error); setTimeout(() => setNotice(""), 3500);
  };
  const completed = items.filter((item) => item.status === "Hoàn thành").length;
  const toggleDone = async (item: Item) => { const nextStatus: Item["status"] = item.status === "Hoàn thành" ? "Mới" : "Hoàn thành"; if (serverAvailable) { const response = await fetch("/api/operations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, status: statusToApi[nextStatus] }) }); if (!response.ok) return setNotice("Không thể cập nhật trạng thái"); } save(items.map((current) => current.id === item.id ? { ...current, status: nextStatus } : current)); };
  const remove = async (item: Item) => { if (serverAvailable) { const response = await fetch(`/api/operations?id=${item.id}`, { method: "DELETE" }); if (!response.ok) return setNotice("Không thể xóa bản ghi"); } save(items.filter((current) => current.id !== item.id)); };
  return <div className="operations-page">
    <section className="operations-hero"><div><p className="eyebrow">TRUNG TÂM VẬN HÀNH</p><h2>{mode}</h2><p>Quản lý tập trung, theo dõi trạng thái và tự động hóa nhắc việc.</p></div><button className="primary-button" onClick={() => setOpen(true)}>＋ Tạo mới</button></section>
    <section className="operations-summary"><article><span>TỔNG BẢN GHI</span><strong>{items.length}</strong></article><article><span>ĐANG XỬ LÝ</span><strong>{items.length - completed}</strong></article><article><span>HOÀN THÀNH</span><strong>{completed}</strong></article></section>
    <section className="panel operations-panel"><div className="operations-toolbar"><label className="search"><span>⌕</span><input placeholder="Tìm kiếm..." value={query} onChange={(e) => setQuery(e.target.value)} /></label><select value={status} onChange={(e) => setStatus(e.target.value)}><option>Tất cả</option><option>Mới</option><option>Đang xử lý</option><option>Hoàn thành</option></select></div>
      <div className="table-wrap"><table><thead><tr><th>MÃ</th><th>NỘI DUNG</th><th>PHỤ TRÁCH</th><th>HẠN</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><strong>{item.code || item.id}</strong></td><td><strong>{item.title}</strong><small>{item.detail}</small></td><td>{item.assignee}</td><td>{item.due}</td><td><span className={`operation-status s-${item.status.replaceAll(" ", "-").toLowerCase()}`}>{item.status}</span></td><td><div className="row-actions"><button onClick={() => toggleDone(item)}>✓ Xong</button>{(mode === "Hóa đơn" || mode === "Thông báo") && <button onClick={() => sendEmail(item)}>✉ Email</button>}<button className="delete" onClick={() => remove(item)}>Xóa</button></div></td></tr>)}</tbody></table></div>
      {!filtered.length && <div className="empty-state"><span>◇</span><h3>Không có dữ liệu</h3><p>Thử thay đổi bộ lọc hoặc tạo bản ghi mới.</p></div>}
    </section>
    {open && <div className="modal-backdrop" onMouseDown={() => setOpen(false)}><form className="modal" onSubmit={add} onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" type="button" onClick={() => setOpen(false)}>×</button><p className="eyebrow">{mode.toUpperCase()}</p><h2>Tạo bản ghi mới</h2><label>Tiêu đề<input name="title" required autoFocus /></label><label>Mô tả<input name="detail" required /></label><div className="form-row"><label>Người phụ trách<input name="assignee" required /></label><label>Hạn xử lý<input name="due" type="date" required /></label></div>{(mode === "Hóa đơn" || mode === "Thông báo") && <label>Email người nhận<input name="email" type="email" placeholder="email@example.com" /></label>}<div className="modal-actions"><button type="button" onClick={() => setOpen(false)}>Hủy</button><button className="primary-button">Lưu</button></div></form></div>}
    {notice && <div className="toast"><span>✓</span>{notice}</div>}
  </div>;
}
