"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { MasterData } from "./MasterData";
import { BillingManager } from "./BillingManager";
import { SettingsManager } from "./SettingsManager";
import { OperationsManager, type OperationMode } from "./OperationsManager";
import { PropertyLayout } from "./PropertyLayout";
import { useRouter } from "next/navigation";

type RoomStatus = "Đang thuê" | "Còn trống" | "Sắp hết hạn" | "Chưa thanh toán";

type Room = {
  id: string;
  tenant: string;
  phone: string;
  price: number;
  status: RoomStatus;
  due: string;
};

type DashboardFinance = {
  summary: { billed: number; paid: number; debt: number };
  revenue: { period: string; billed: number; paid: number }[];
};

const initialRooms: Room[] = [
  { id: "P.101", tenant: "Nguyễn Minh Anh", phone: "090 312 4578", price: 3200000, status: "Đang thuê", due: "Đã thanh toán" },
  { id: "P.102", tenant: "Trần Quốc Bảo", phone: "098 672 0193", price: 3000000, status: "Chưa thanh toán", due: "Quá hạn 3 ngày" },
  { id: "P.103", tenant: "—", phone: "Sẵn sàng cho thuê", price: 2800000, status: "Còn trống", due: "Đã vệ sinh" },
  { id: "P.201", tenant: "Lê Hoàng Yến", phone: "093 548 2110", price: 3500000, status: "Sắp hết hạn", due: "Còn 12 ngày" },
  { id: "P.202", tenant: "Phạm Gia Huy", phone: "091 806 3467", price: 3200000, status: "Đang thuê", due: "Đã thanh toán" },
  { id: "P.203", tenant: "Võ Thanh Tú", phone: "097 447 9261", price: 3000000, status: "Chưa thanh toán", due: "Hạn hôm nay" },
];

const navGroups = [
  { title: "QUẢN LÝ", items: [["Tổng quan", "dashboard"], ["Sơ đồ phòng", "dashboard"], ["Dữ liệu nền", "database"], ["Thu tiền", "wallet"]] },
  { title: "VẬN HÀNH", items: [["Điện nước", "meter"], ["Hóa đơn", "invoice"], ["Thu chi", "wallet"], ["Phương tiện", "meter"], ["Tài sản", "database"], ["Dịch vụ", "invoice"], ["Bảo trì", "tools"], ["Công việc", "tools"], ["Thông báo", "invoice"]] },
  { title: "BÁO CÁO", items: [["Báo cáo", "report"]] },
  { title: "CÀI ĐẶT", items: [["Cài đặt", "settings"]] },
] as const;

function SidebarIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" /></>,
    wallet: <><path d="M4 7a3 3 0 0 1 3-3h12a1 1 0 0 1 1 1v15H7a3 3 0 0 1-3-3z" /><path d="M4 8h14" /><path d="M15 12h6v5h-6a2.5 2.5 0 0 1 0-5z" /></>,
    meter: <><path d="M5 20a8 8 0 1 1 14 0" /><path d="m12 12 4-3" /><path d="M7 20h10" /></>,
    invoice: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
    tools: <><path d="M14.5 6.5a4 4 0 0 0-5-5l2.2 2.2-2 2-2.2-2.2a4 4 0 0 0 5 5l7.1 7.1a2.8 2.8 0 0 1-4 4l-7.1-7.1a4 4 0 0 0-5-5" /></>,
    report: <><path d="M4 20V10M10 20V4M16 20v-7M22 20V7" /><path d="M2 20h22" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.5 1A7 7 0 0 0 14 5.7L13.6 3h-4L9 5.7a7 7 0 0 0-2.3 1.4l-2.5-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.5-1A7 7 0 0 0 9 18.3l.5 2.7h4l.5-2.7a7 7 0 0 0 2.3-1.4l2.5 1 2-3.4-2-1.5a7 7 0 0 0 .2-1z" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

const currency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

export default function Dashboard({
  initialNav = "Tổng quan",
  initialMasterSection = "Nhà trọ",
}: {
  initialNav?: string;
  initialMasterSection?: "Nhà trọ" | "Phòng trọ" | "Khách thuê";
}) {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState(initialNav);
  const [rooms, setRooms] = useState(initialRooms);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"Tất cả" | RoomStatus>("Tất cả");
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [notice, setNotice] = useState("");
  const [databaseOnline, setDatabaseOnline] = useState(false);
  const [masterSection, setMasterSection] = useState<"Nhà trọ" | "Phòng trọ" | "Khách thuê">(initialMasterSection);
  const [finance, setFinance] = useState<DashboardFinance>({
    summary: { billed: 0, paid: 0, debt: 0 },
    revenue: [],
  });

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const response = await fetch("/api/rooms");
        if (!response.ok) return;
        const data = await response.json();
        const statusMap: Record<string, RoomStatus> = {
          occupied: "Đang thuê", vacant: "Còn trống", expiring: "Sắp hết hạn", unpaid: "Chưa thanh toán",
        };
        setRooms(data.map((room: Record<string, string | number | null>) => ({
          id: String(room.code),
          tenant: room.tenant_name ? String(room.tenant_name) : "—",
          phone: room.tenant_phone ? String(room.tenant_phone) : "Sẵn sàng cho thuê",
          price: Number(room.monthly_rent),
          status: statusMap[String(room.status)] || "Còn trống",
          due: String(room.payment_note),
        })));
        setDatabaseOnline(true);
      } catch {
        setDatabaseOnline(false);
      }
    };
    void loadRooms();
  }, []);

  useEffect(() => {
    if (activeNav !== "Tổng quan") return;
    fetch("/api/dashboard", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Không thể tải doanh thu");
        return response.json();
      })
      .then((data) => setFinance({
        summary: {
          billed: Number(data.summary.billed),
          paid: Number(data.summary.paid),
          debt: Number(data.summary.debt),
        },
        revenue: data.revenue.map((item: { period: string; billed: string | number; paid: string | number }) => ({
          period: item.period,
          billed: Number(item.billed),
          paid: Number(item.paid),
        })),
      }))
      .catch(() => undefined);
  }, [activeNav]);

  const filteredRooms = useMemo(
    () =>
      rooms.filter(
        (room) =>
          (filter === "Tất cả" || room.status === filter) &&
          `${room.id} ${room.tenant}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [filter, query, rooms],
  );

  const toast = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const addRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const id = String(data.get("room")).trim().toUpperCase();
    const price = Number(data.get("price"));
    if (!id || !price) return;
    const newRoom: Room = { id, tenant: "—", phone: "Sẵn sàng cho thuê", price, status: "Còn trống", due: "Phòng mới" };
    if (databaseOnline) {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: id, monthlyRent: price }),
      });
      if (!response.ok) {
        const result = await response.json();
        toast(result.error || "Không thể thêm phòng");
        return;
      }
    }
    setRooms((current) => [...current, newRoom]);
    setShowAddRoom(false);
    toast(`Đã thêm phòng ${id}`);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <span>
            <strong>Nhà Trọ 365</strong>
            <small>Quản lý nhẹ nhàng</small>
          </span>
        </div>

        <nav aria-label="Điều hướng chính">
          {navGroups.map((group) => <div className="nav-group" key={group.title}>
            <p className="nav-label">{group.title}</p>
            {group.items.map(([label, icon]) => (
              <button
                className={activeNav === label ? "nav-item active" : "nav-item"}
                key={label}
                title={label}
                aria-label={label}
                onClick={() => {
                  setActiveNav(label);
                  if (label === "Tổng quan") router.push("/");
                  else if (label === "Dữ liệu nền") router.push("/du-lieu-nen/nha-tro");
                  else if (label === "Thu tiền") router.push("/thu-tien");
                  else if (label === "Cài đặt") router.push("/cai-dat");
                  else if (!["Sơ đồ phòng", "Điện nước", "Hóa đơn", "Thu chi", "Phương tiện", "Tài sản", "Dịch vụ", "Bảo trì", "Công việc", "Thông báo", "Báo cáo"].includes(label)) toast(`${label} đang được hoàn thiện trong bản tiếp theo`);
                }}
              >
                <span className="nav-icon"><SidebarIcon name={icon} /></span>
                {label}
                {label === "Bảo trì" && <em>3</em>}
              </button>
            ))}
          </div>)}
        </nav>

        <div className="sidebar-bottom">
          <div className="support-card">
            <span>?</span>
            <div><strong>Cần hỗ trợ?</strong><small>Trò chuyện với chúng tôi</small></div>
          </div>
          <button className="profile">
            <span className="avatar">TA</span>
            <span><strong>Tuấn Anh</strong><small>Chủ nhà trọ</small></span>
            <b>•••</b>
          </button>
          <a className="logout-link" href="/api/auth/logout">Đăng xuất</a>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">THỨ NĂM, 30 THÁNG 7</p>
            <h1>Chào buổi sáng, Tuấn Anh!</h1>
            <p>
              Mọi thứ tại Nhà trọ An Nhiên đang vận hành tốt.
              <span className={databaseOnline ? "db-state online" : "db-state"}>
                {databaseOnline ? "● PostgreSQL đã kết nối" : "● Dữ liệu mẫu"}
              </span>
            </p>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Thông báo">
              ♢<i />
            </button>
            {activeNav === "Tổng quan" && <button className="primary-button" onClick={() => setShowAddRoom(true)}>
              <span>＋</span> Thêm phòng
            </button>}
          </div>
        </header>

        {activeNav === "Tổng quan" ? <>
        <section className="stats-grid" aria-label="Số liệu tổng quan">
          <article className="stat-card">
            <div className="stat-top"><span className="stat-icon green">▦</span><b className="trend up">↗ 8.3%</b></div>
            <p>Tổng số phòng</p><h2>24</h2><small>3 phòng còn trống</small>
          </article>
          <article className="stat-card">
            <div className="stat-top"><span className="stat-icon sage">⌂</span><b className="trend up">↗ 4.2%</b></div>
            <p>Đang cho thuê</p><h2>21</h2><small>Tỷ lệ lấp đầy 87.5%</small>
          </article>
          <article className="stat-card">
            <div className="stat-top"><span className="stat-icon coral">₫</span><b className="trend up">↗ 12.5%</b></div>
            <p>Doanh thu tháng {new Date().getMonth() + 1}</p><h2>{currency(finance.summary.billed)}</h2><small>Đã thu {currency(finance.summary.paid)}</small>
          </article>
          <article className="stat-card">
            <div className="stat-top"><span className="stat-icon amber">!</span><b className="trend down">2 hóa đơn</b></div>
            <p>Công nợ cần thu</p><h2>{currency(finance.summary.debt)}</h2><small>Số tiền chưa thanh toán trong tháng</small>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="panel revenue-panel">
            <div className="panel-head">
              <div><p className="eyebrow">DÒNG TIỀN</p><h3>Doanh thu 6 tháng</h3></div>
              <button className="select-button">6 tháng gần nhất⌄</button>
            </div>
            <div className="revenue-summary">
              <div><small>TỔNG DOANH THU ĐÃ THU</small><strong>{currency(finance.revenue.reduce((sum, item) => sum + item.paid, 0))}</strong></div>
              <span><i className="dot green-dot" /> Đã thu</span>
              <span><i className="dot beige-dot" /> Dự kiến</span>
            </div>
            <div className="chart" aria-label="Biểu đồ doanh thu từ tháng 2 đến tháng 7">
              {finance.revenue.map((item) => {
                const maxRevenue = Math.max(1, ...finance.revenue.map((month) => month.billed));
                const height = Math.max(item.paid > 0 ? 6 : 0, Math.round(item.paid / maxRevenue * 100));
                return <div className="bar-group" key={item.period}>
                  <div className="bar-track"><span style={{ height: `${height}%` }} /></div>
                  <small>Th.{Number(item.period.slice(5))}</small>
                </div>
              })}
              <div className="chart-grid"><i /><i /><i /><i /></div>
            </div>
          </article>

          <article className="panel occupancy-panel">
            <div className="panel-head"><div><p className="eyebrow">CÔNG SUẤT</p><h3>Tình trạng phòng</h3></div><button className="link-button">Xem tất cả →</button></div>
            <div className="occupancy-body">
              <div className="donut"><div><strong>87.5%</strong><small>Lấp đầy</small></div></div>
              <div className="legend">
                <div><span><i className="dot green-dot" /> Đang thuê</span><b>21</b></div>
                <div><span><i className="dot sage-dot" /> Còn trống</span><b>3</b></div>
                <div><span><i className="dot coral-dot" /> Sắp hết hạn</span><b>2</b></div>
              </div>
            </div>
            <div className="occupancy-note"><span>⌁</span><p><strong>Phòng P.103 đang trống</strong><small>Đăng tin để tìm khách thuê nhanh hơn</small></p><button onClick={() => toast("Đã tạo bản nháp tin đăng cho P.103")}>Đăng tin</button></div>
          </article>
        </section>

        <section className="panel rooms-panel">
          <div className="rooms-heading">
            <div><p className="eyebrow">NHÀ TRỌ AN NHIÊN</p><h3>Danh sách phòng</h3></div>
            <div className="room-tools">
              <label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm phòng, khách thuê..." /></label>
              <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Lọc tình trạng">
                <option>Tất cả</option><option>Đang thuê</option><option>Còn trống</option><option>Sắp hết hạn</option><option>Chưa thanh toán</option>
              </select>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>PHÒNG</th><th>KHÁCH THUÊ</th><th>GIÁ THUÊ</th><th>TÌNH TRẠNG</th><th>THANH TOÁN</th><th /></tr></thead>
              <tbody>
                {filteredRooms.map((room) => (
                  <tr key={room.id}>
                    <td><strong className="room-number">{room.id}</strong></td>
                    <td><strong>{room.tenant}</strong><small>{room.phone}</small></td>
                    <td><strong>{currency(room.price)}</strong><small>/ tháng</small></td>
                    <td><span className={`status ${room.status.replaceAll(" ", "-").toLowerCase()}`}>{room.status}</span></td>
                    <td><strong className={room.due.includes("Quá hạn") ? "overdue" : ""}>{room.due}</strong><small>Kỳ tháng 7/2026</small></td>
                    <td><button className="more" onClick={() => toast(`Đã mở chi tiết ${room.id}`)}>•••</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer"><span>Hiển thị {filteredRooms.length} trong tổng số {rooms.length} phòng</span><div><button disabled>←</button><b>1</b><button>2</button><button>3</button><button>→</button></div></div>
        </section>
        </> : activeNav === "Dữ liệu nền" ? <>
          <div className="master-tabs" role="tablist" aria-label="Danh mục dữ liệu nền">
            {(["Nhà trọ", "Phòng trọ", "Khách thuê"] as const).map((item) => (
              <button
                key={item}
                role="tab"
                aria-selected={masterSection === item}
                className={masterSection === item ? "active" : ""}
                onClick={() => {
                  setMasterSection(item);
                  const slug = item === "Nhà trọ" ? "nha-tro" : item === "Phòng trọ" ? "phong-tro" : "nguoi-thue";
                  router.push(`/du-lieu-nen/${slug}`);
                }}
              >
                <span>{item === "Nhà trọ" ? "▥" : item === "Phòng trọ" ? "▦" : "♙"}</span>
                {item === "Khách thuê" ? "Người thuê" : item}
              </button>
            ))}
          </div>
          <MasterData section={masterSection} />
        </> : activeNav === "Thu tiền" ? <>
          <BillingManager />
        </> : activeNav === "Cài đặt" ? <>
          <SettingsManager />
        </> : activeNav === "Sơ đồ phòng" ? <>
          <PropertyLayout />
        </> : ["Điện nước", "Hóa đơn", "Thu chi", "Phương tiện", "Tài sản", "Dịch vụ", "Bảo trì", "Công việc", "Thông báo", "Báo cáo"].includes(activeNav) ? <>
          <OperationsManager mode={activeNav as OperationMode} />
        </> : null}
      </section>

      {showAddRoom && (
        <div className="modal-backdrop" onMouseDown={() => setShowAddRoom(false)}>
          <form className="modal" onSubmit={addRoom} onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowAddRoom(false)}>×</button>
            <p className="eyebrow">PHÒNG MỚI</p><h2>Thêm phòng trọ</h2><p>Nhập thông tin cơ bản. Bạn có thể cập nhật chi tiết sau.</p>
            <label>Mã phòng<input name="room" placeholder="Ví dụ: P.204" autoFocus required /></label>
            <label>Giá thuê mỗi tháng<input name="price" type="number" placeholder="3000000" min="1" required /></label>
            <div className="modal-actions"><button type="button" onClick={() => setShowAddRoom(false)}>Hủy</button><button className="primary-button" type="submit">Thêm phòng</button></div>
          </form>
        </div>
      )}
      {notice && <div className="toast"><span>✓</span>{notice}</div>}
    </main>
  );
}
