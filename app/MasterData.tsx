"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Section = "Nhà trọ" | "Phòng trọ" | "Khách thuê";
type Property = { id: string; name: string; address: string; manager_name: string | null; manager_phone: string | null; room_count: number; occupied_count: number };
type Room = { id: string; code: string; floor: number | null; area_sqm: string | null; monthly_rent: string; status: string; property_id: string; property_name: string };
type Tenant = { id: string; full_name: string; phone: string; email: string | null; identity_number: string | null; status: string; room_code: string | null; property_name: string | null };
type RecordItem = Property | Room | Tenant;

const money = (value: string) => `${new Intl.NumberFormat("vi-VN").format(Number(value))} ₫`;
const apiType = (section: Section) => section === "Nhà trọ" ? "property" : section === "Phòng trọ" ? "room" : "tenant";

export function MasterData({ section }: { section: Section }) {
  const [data, setData] = useState<{ properties: Property[]; rooms: Room[]; tenants: Tenant[] }>({ properties: [], rooms: [], tenants: [] });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [deleting, setDeleting] = useState<RecordItem | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [presetPropertyId, setPresetPropertyId] = useState("");
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/master-data");
    if (response.ok) setData(await response.json());
    setLoading(false);
  };

  useEffect(() => {
    void load();
    setShowForm(false);
    setPresetPropertyId("");
    const params = new URLSearchParams(window.location.search);
    if (section === "Phòng trọ" && params.get("create") === "1") {
      setPresetPropertyId(params.get("propertyId") || "");
      setShowForm(true);
    }
  }, [section]);
  useEffect(() => { setQuery(""); setFilter("all"); setPage(1); setEditing(null); }, [section]);
  useEffect(() => { setPage(1); }, [query, filter, pageSize]);

  const source: RecordItem[] = section === "Nhà trọ" ? data.properties : section === "Phòng trọ" ? data.rooms : data.tenants;
  const filtered = useMemo(() => source.filter((item) => {
    const matchesQuery = JSON.stringify(item).toLowerCase().includes(query.trim().toLowerCase());
    if (!matchesQuery || filter === "all") return matchesQuery;
    if (section === "Nhà trọ") {
      const property = item as Property;
      return filter === "occupied" ? property.occupied_count > 0 : filter === "vacant" ? property.occupied_count === 0 : true;
    }
    if (section === "Phòng trọ") {
      const room = item as Room;
      return filter.startsWith("property:") ? room.property_id === filter.slice(9) : room.status === filter;
    }
    const tenant = item as Tenant;
    return filter === "has-room" ? Boolean(tenant.room_code) : filter === "no-room" ? !tenant.room_code : tenant.status === filter;
  }), [source, query, filter, section]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (item: RecordItem) => { setEditing(item); setShowForm(true); };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = section === "Nhà trọ"
      ? { type: "property", id: editing?.id, name: form.get("name"), address: form.get("address"), managerName: form.get("managerName"), managerPhone: form.get("managerPhone") }
      : section === "Phòng trọ"
        ? { type: "room", id: editing?.id, propertyId: form.get("propertyId"), code: form.get("code"), floor: Number(form.get("floor")), area: Number(form.get("area")), monthlyRent: Number(form.get("monthlyRent")), status: form.get("status") }
        : { type: "tenant", id: editing?.id, fullName: form.get("fullName"), phone: form.get("phone"), email: form.get("email"), identityNumber: form.get("identityNumber"), roomId: form.get("roomId"), deposit: Number(form.get("deposit")), status: form.get("status") };
    const response = await fetch("/api/master-data", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Không thể lưu dữ liệu"); return; }
    setMessage(editing ? "Đã cập nhật dữ liệu" : "Đã thêm dữ liệu mới");
    setShowForm(false);
    setEditing(null);
    await load();
  };

  const remove = async () => {
    if (!deleting) return;
    const response = await fetch(`/api/master-data?type=${apiType(section)}&id=${deleting.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Không thể xóa dữ liệu"); setDeleting(null); return; }
    setMessage("Đã xóa dữ liệu");
    setDeleting(null);
    await load();
  };

  const title = section === "Nhà trọ" ? "Danh mục nhà trọ" : section === "Phòng trọ" ? "Danh mục phòng trọ" : "Danh mục người thuê";
  const subtitle = section === "Nhà trọ" ? "Quản lý tất cả khu nhà thuộc sở hữu của bạn" : section === "Phòng trọ" ? "Theo dõi phòng, diện tích, tầng và giá thuê" : "Hồ sơ và tình trạng lưu trú của người thuê";

  return (
    <section className="master-page">
      <div className="master-hero">
        <div><p className="eyebrow">DỮ LIỆU NỀN</p><h2>{title}</h2><p>{subtitle}</p></div>
        <button className="primary-button" onClick={openCreate}>＋ Thêm {section.toLowerCase()}</button>
      </div>

      <div className="master-summary">
        <article><small>NHÀ TRỌ</small><strong>{data.properties.length}</strong><span>khu đang quản lý</span></article>
        <article><small>PHÒNG TRỌ</small><strong>{data.rooms.length}</strong><span>{data.rooms.filter((r) => r.status === "vacant").length} phòng còn trống</span></article>
        <article><small>NGƯỜI THUÊ</small><strong>{data.tenants.length}</strong><span>hồ sơ trong hệ thống</span></article>
      </div>

      <div className="panel master-table-panel">
        <div className="master-toolbar">
          <div><h3>{title}</h3><span>{filtered.length} bản ghi</span></div>
          <div className="master-controls">
            <label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kiếm..." /></label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Lọc dữ liệu">
              <option value="all">Tất cả</option>
              {section === "Nhà trọ" && <><option value="occupied">Đã có khách</option><option value="vacant">Chưa có khách</option></>}
              {section === "Phòng trọ" && <><option value="vacant">Còn trống</option><option value="occupied">Đang thuê</option><option value="unpaid">Chưa thanh toán</option>{data.properties.map((p) => <option key={p.id} value={`property:${p.id}`}>{p.name}</option>)}</>}
              {section === "Khách thuê" && <><option value="has-room">Đã xếp phòng</option><option value="no-room">Chưa xếp phòng</option><option value="active">Đang hoạt động</option><option value="inactive">Ngừng hoạt động</option></>}
            </select>
          </div>
        </div>
        <div className="table-wrap">
          {section === "Nhà trọ" && <table><thead><tr><th>TÊN NHÀ TRỌ</th><th>ĐỊA CHỈ</th><th>QUẢN LÝ</th><th>PHÒNG</th><th>LẤP ĐẦY</th><th>THAO TÁC</th></tr></thead><tbody>{(rows as Property[]).map((p) => <tr key={p.id}><td><strong>{p.name}</strong></td><td>{p.address}</td><td><strong>{p.manager_name || "—"}</strong><small>{p.manager_phone || "Chưa cập nhật"}</small></td><td><strong>{p.room_count}</strong><small>phòng</small></td><td><span className="status đang-thuê">{p.room_count ? Math.round(p.occupied_count / p.room_count * 100) : 0}%</span></td><td><RowActions onCreateRoom={() => router.push(`/du-lieu-nen/phong-tro?propertyId=${p.id}&create=1`)} onEdit={() => openEdit(p)} onDelete={() => setDeleting(p)} /></td></tr>)}</tbody></table>}
          {section === "Phòng trọ" && <table><thead><tr><th>PHÒNG</th><th>NHÀ TRỌ</th><th>TẦNG / DIỆN TÍCH</th><th>GIÁ THUÊ</th><th>TÌNH TRẠNG</th><th>THAO TÁC</th></tr></thead><tbody>{(rows as Room[]).map((r) => <tr key={r.id}><td><strong className="room-number">{r.code}</strong></td><td><strong>{r.property_name}</strong></td><td><strong>Tầng {r.floor || "—"}</strong><small>{r.area_sqm ? `${r.area_sqm} m²` : "Chưa cập nhật"}</small></td><td><strong>{money(r.monthly_rent)}</strong><small>/ tháng</small></td><td><span className={`status ${r.status === "occupied" ? "đang-thuê" : "còn-trống"}`}>{r.status === "occupied" ? "Đang thuê" : r.status === "unpaid" ? "Chưa thanh toán" : "Còn trống"}</span></td><td><RowActions onEdit={() => openEdit(r)} onDelete={() => setDeleting(r)} /></td></tr>)}</tbody></table>}
          {section === "Khách thuê" && <table><thead><tr><th>NGƯỜI THUÊ</th><th>LIÊN HỆ</th><th>CCCD</th><th>PHÒNG</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>{(rows as Tenant[]).map((t) => <tr key={t.id}><td><strong>{t.full_name}</strong></td><td><strong>{t.phone}</strong><small>{t.email || "Chưa có email"}</small></td><td>{t.identity_number || "—"}</td><td><strong>{t.room_code || "Chưa xếp phòng"}</strong><small>{t.property_name || ""}</small></td><td><span className={`status ${t.status === "active" ? "đang-thuê" : "còn-trống"}`}>{t.status === "active" ? "Đang hoạt động" : "Ngừng hoạt động"}</span></td><td><RowActions onEdit={() => openEdit(t)} onDelete={() => setDeleting(t)} /></td></tr>)}</tbody></table>}
        </div>

        {loading && <div className="empty-state"><p>Đang tải dữ liệu…</p></div>}
        {!loading && !rows.length && <div className="empty-state"><span>◇</span><h3>Không có dữ liệu phù hợp</h3><p>Thử thay đổi từ khóa hoặc bộ lọc.</p></div>}
        <div className="pagination">
          <span>Hiển thị {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)} / {filtered.length}</span>
          <label>Số dòng<select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}><option value="5">5</option><option value="10">10</option><option value="20">20</option></select></label>
          <div><button disabled={currentPage === 1} onClick={() => setPage(1)}>«</button><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>‹</button><b>{currentPage} / {totalPages}</b><button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>›</button><button disabled={currentPage === totalPages} onClick={() => setPage(totalPages)}>»</button></div>
        </div>
      </div>

      {showForm && <DataForm section={section} editing={editing} data={data} presetPropertyId={presetPropertyId} onClose={() => { setShowForm(false); setEditing(null); setPresetPropertyId(""); }} onSubmit={submit} />}
      {deleting && <div className="modal-backdrop" onMouseDown={() => setDeleting(null)}><div className="confirm-dialog" onMouseDown={(e) => e.stopPropagation()}><span className="danger-mark">!</span><h2>Xóa dữ liệu này?</h2><p>Thao tác không thể hoàn tác. Các dữ liệu đang được sử dụng sẽ không thể xóa.</p><div className="modal-actions"><button onClick={() => setDeleting(null)}>Hủy</button><button className="danger-button" onClick={remove}>Xóa dữ liệu</button></div></div></div>}
      {message && <div className="toast" onClick={() => setMessage("")}><span>✓</span>{message}</div>}
    </section>
  );
}

function RowActions({ onEdit, onDelete, onCreateRoom }: { onEdit: () => void; onDelete: () => void; onCreateRoom?: () => void }) {
  return <div className="row-actions">{onCreateRoom && <button className="create-room" onClick={onCreateRoom} title="Tạo phòng cho nhà trọ">＋ Phòng</button>}<button onClick={onEdit} title="Chỉnh sửa">Sửa</button><button className="delete" onClick={onDelete} title="Xóa">Xóa</button></div>;
}

function DataForm({ section, editing, data, presetPropertyId, onClose, onSubmit }: { section: Section; editing: RecordItem | null; data: { properties: Property[]; rooms: Room[]; tenants: Tenant[] }; presetPropertyId?: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const property = editing as Property | null;
  const room = editing as Room | null;
  const tenant = editing as Tenant | null;
  useEffect(() => {
    if (section === "Phòng trọ" && !editing && presetPropertyId) {
      const select = document.querySelector<HTMLSelectElement>('select[name="propertyId"]');
      if (select) select.value = presetPropertyId;
    }
  }, [section, editing, presetPropertyId]);
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal master-form" onSubmit={onSubmit} onMouseDown={(e) => e.stopPropagation()}>
    <button type="button" className="modal-close" onClick={onClose}>×</button><p className="eyebrow">{editing ? "CHỈNH SỬA" : "THÊM MỚI"}</p><h2>{editing ? "Cập nhật" : "Thêm"} {section.toLowerCase()}</h2>
    {section === "Nhà trọ" && <><label>Tên nhà trọ<input name="name" defaultValue={property?.name || ""} required /></label><label>Địa chỉ<input name="address" defaultValue={property?.address || ""} required /></label><div className="form-row"><label>Người quản lý<input name="managerName" defaultValue={property?.manager_name || ""} /></label><label>Số điện thoại<input name="managerPhone" defaultValue={property?.manager_phone || ""} /></label></div></>}
    {section === "Phòng trọ" && <><label>Nhà trọ<select name="propertyId" defaultValue={room?.property_id} required>{data.properties.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label><div className="form-row"><label>Mã phòng<input name="code" defaultValue={room?.code || ""} required /></label><label>Tầng<input name="floor" type="number" min="0" defaultValue={room?.floor || ""} /></label></div><div className="form-row"><label>Diện tích (m²)<input name="area" type="number" min="1" step=".1" defaultValue={room?.area_sqm || ""} /></label><label>Giá thuê<input name="monthlyRent" type="number" min="1" defaultValue={room?.monthly_rent || ""} required /></label></div>{editing && <label>Trạng thái<select name="status" defaultValue={room?.status}><option value="vacant">Còn trống</option><option value="occupied">Đang thuê</option><option value="unpaid">Chưa thanh toán</option><option value="expiring">Sắp hết hạn</option></select></label>}</>}
    {section === "Khách thuê" && <><div className="form-row"><label>Họ và tên<input name="fullName" defaultValue={tenant?.full_name || ""} required /></label><label>Số điện thoại<input name="phone" defaultValue={tenant?.phone || ""} required /></label></div><div className="form-row"><label>Email<input name="email" type="email" defaultValue={tenant?.email || ""} /></label><label>Số CCCD<input name="identityNumber" defaultValue={tenant?.identity_number || ""} /></label></div>{!editing && <><label>Xếp vào phòng<select name="roomId"><option value="">Chưa xếp phòng</option>{data.rooms.filter((r) => r.status === "vacant").map((r) => <option value={r.id} key={r.id}>{r.property_name} — {r.code}</option>)}</select></label><label>Tiền đặt cọc<input name="deposit" type="number" min="0" /></label></>}{editing && <label>Trạng thái<select name="status" defaultValue={tenant?.status}><option value="active">Đang hoạt động</option><option value="inactive">Ngừng hoạt động</option></select></label>}</>}
    <div className="modal-actions"><button type="button" onClick={onClose}>Hủy</button><button className="primary-button" type="submit">{editing ? "Lưu thay đổi" : "Thêm mới"}</button></div>
  </form></div>;
}
