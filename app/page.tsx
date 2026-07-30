"use client";

import { FormEvent, useMemo, useState } from "react";

type RoomStatus = "Đang thuê" | "Còn trống" | "Sắp hết hạn" | "Chưa thanh toán";

type Room = {
  id: string;
  tenant: string;
  phone: string;
  price: number;
  status: RoomStatus;
  due: string;
};

const initialRooms: Room[] = [
  { id: "P.101", tenant: "Nguyễn Minh Anh", phone: "090 312 4578", price: 3200000, status: "Đang thuê", due: "Đã thanh toán" },
  { id: "P.102", tenant: "Trần Quốc Bảo", phone: "098 672 0193", price: 3000000, status: "Chưa thanh toán", due: "Quá hạn 3 ngày" },
  { id: "P.103", tenant: "—", phone: "Sẵn sàng cho thuê", price: 2800000, status: "Còn trống", due: "Đã vệ sinh" },
  { id: "P.201", tenant: "Lê Hoàng Yến", phone: "093 548 2110", price: 3500000, status: "Sắp hết hạn", due: "Còn 12 ngày" },
  { id: "P.202", tenant: "Phạm Gia Huy", phone: "091 806 3467", price: 3200000, status: "Đang thuê", due: "Đã thanh toán" },
  { id: "P.203", tenant: "Võ Thanh Tú", phone: "097 447 9261", price: 3000000, status: "Chưa thanh toán", due: "Hạn hôm nay" },
];

const navItems = [
  ["Tổng quan", "⌂"],
  ["Phòng trọ", "▦"],
  ["Khách thuê", "♙"],
  ["Thu tiền", "₫"],
  ["Điện nước", "ϟ"],
  ["Hóa đơn", "▤"],
  ["Bảo trì", "⌕"],
  ["Báo cáo", "↗"],
] as const;

const currency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

export default function Home() {
  const [activeNav, setActiveNav] = useState("Tổng quan");
  const [rooms, setRooms] = useState(initialRooms);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"Tất cả" | RoomStatus>("Tất cả");
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [notice, setNotice] = useState("");

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

  const addRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const id = String(data.get("room")).trim().toUpperCase();
    const price = Number(data.get("price"));
    if (!id || !price) return;
    setRooms((current) => [
      ...current,
      { id, tenant: "—", phone: "Sẵn sàng cho thuê", price, status: "Còn trống", due: "Phòng mới" },
    ]);
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
          <p className="nav-label">QUẢN LÝ</p>
          {navItems.map(([label, icon]) => (
            <button
              className={activeNav === label ? "nav-item active" : "nav-item"}
              key={label}
              onClick={() => {
                setActiveNav(label);
                if (label !== "Tổng quan") toast(`${label} đang được hoàn thiện trong bản tiếp theo`);
              }}
            >
              <span className="nav-icon">{icon}</span>
              {label}
              {label === "Bảo trì" && <em>3</em>}
            </button>
          ))}
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
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">THỨ NĂM, 30 THÁNG 7</p>
            <h1>Chào buổi sáng, Tuấn Anh!</h1>
            <p>Mọi thứ tại Nhà trọ An Nhiên đang vận hành tốt.</p>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Thông báo">
              ♢<i />
            </button>
            <button className="primary-button" onClick={() => setShowAddRoom(true)}>
              <span>＋</span> Thêm phòng
            </button>
          </div>
        </header>

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
            <p>Doanh thu tháng 7</p><h2>68,4 tr</h2><small>Đã thu 62,1 triệu</small>
          </article>
          <article className="stat-card">
            <div className="stat-top"><span className="stat-icon amber">!</span><b className="trend down">2 hóa đơn</b></div>
            <p>Công nợ cần thu</p><h2>6,3 tr</h2><small>Giảm 1,2 triệu so tháng trước</small>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="panel revenue-panel">
            <div className="panel-head">
              <div><p className="eyebrow">DÒNG TIỀN</p><h3>Doanh thu 6 tháng</h3></div>
              <button className="select-button">6 tháng gần nhất⌄</button>
            </div>
            <div className="revenue-summary">
              <div><small>TỔNG DOANH THU</small><strong>372,8 triệu</strong></div>
              <span><i className="dot green-dot" /> Đã thu</span>
              <span><i className="dot beige-dot" /> Dự kiến</span>
            </div>
            <div className="chart" aria-label="Biểu đồ doanh thu từ tháng 2 đến tháng 7">
              {[49, 58, 55, 71, 64, 82].map((height, index) => (
                <div className="bar-group" key={height + index}>
                  <div className="bar-track"><span style={{ height: `${height}%` }} /></div>
                  <small>Th.{index + 2}</small>
                </div>
              ))}
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
