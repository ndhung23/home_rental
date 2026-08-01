"use client";

import { useEffect, useMemo, useState } from "react";

type Room = { id: string; code: string; floor: string | null; monthly_rent: string | number; status: string; property_id: string; property_name: string };
type Property = { id: string; name: string; address: string };

const money = (value: string | number) => new Intl.NumberFormat("vi-VN").format(Number(value)) + " ₫";

export function PropertyLayout() {
  const [rooms, setRooms] = useState<Room[]>([]); const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState(""); const [status, setStatus] = useState("all"); const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/master-data", { cache: "no-store" }).then((r) => r.json()).then((data) => { setRooms(data.rooms || []); setProperties(data.properties || []); setPropertyId(data.properties?.[0]?.id || ""); }).finally(() => setLoading(false)); }, []);
  const visible = useMemo(() => rooms.filter((room) => (!propertyId || room.property_id === propertyId) && (status === "all" || room.status === status)), [rooms, propertyId, status]);
  const floors = useMemo(() => [...new Set(visible.map((room) => room.floor || "Chưa phân tầng"))], [visible]);
  return <div className="layout-page">
    <section className="operations-hero"><div><p className="eyebrow">VẬN HÀNH TRỰC QUAN</p><h2>Sơ đồ phòng</h2><p>Xem nhanh tình trạng lấp đầy, giá thuê và vị trí từng phòng.</p></div><div className="layout-filters"><select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Mọi trạng thái</option><option value="occupied">Đang thuê</option><option value="vacant">Còn trống</option><option value="expiring">Sắp hết hạn</option></select></div></section>
    <section className="layout-legend"><span><i className="occupied" />Đang thuê</span><span><i className="vacant" />Còn trống</span><span><i className="expiring" />Sắp hết hạn</span><b>{visible.length} phòng</b></section>
    {loading ? <div className="empty-state"><p>Đang tải sơ đồ...</p></div> : floors.map((floor) => <section className="floor-section" key={floor}><div className="floor-title"><span>{floor}</span><small>{visible.filter((room) => (room.floor || "Chưa phân tầng") === floor).length} phòng</small></div><div className="room-map">{visible.filter((room) => (room.floor || "Chưa phân tầng") === floor).map((room) => <article className={`room-tile ${room.status}`} key={room.id}><div><strong>{room.code}</strong><span>{room.status === "occupied" ? "Đang thuê" : room.status === "vacant" ? "Còn trống" : "Sắp hết hạn"}</span></div><small>{money(room.monthly_rent)} / tháng</small></article>)}</div></section>)}
    {!loading && !visible.length && <div className="panel empty-state"><span>▦</span><h3>Chưa có phòng phù hợp</h3><p>Hãy thêm phòng hoặc thay đổi bộ lọc.</p></div>}
  </div>;
}
