# Home Rental

Ứng dụng quản lý nhà trọ dành cho chủ trọ, xây dựng bằng Next.js, TypeScript và PostgreSQL/Supabase.

## Chức năng

- Đăng nhập và phân quyền chủ trọ
- Quản lý nhà trọ, phòng trọ và người thuê
- Tìm kiếm, lọc, phân trang và CRUD dữ liệu
- Cấu hình giá điện, nước, Internet, dịch vụ riêng cho từng nhà trọ
- Nhập chỉ số điện nước và tính tiền hàng tháng
- Tạo hóa đơn, theo dõi công nợ và ghi nhận thanh toán

## Công nghệ

- Next.js + TypeScript
- Tailwind CSS
- PostgreSQL / Supabase
- Vercel

## Chạy local

```bash
npm install
cp .env.example .env
npm run dev
```

Truy cập `http://127.0.0.1:3000`.

Biến môi trường và thông tin kết nối database không được lưu trong repository.
