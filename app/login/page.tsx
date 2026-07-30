import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "../../lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = verifySessionToken((await cookies()).get("hm_session")?.value);
  if (session) redirect("/");

  return (
    <main className="login-page">
      <section className="login-welcome">
        <div className="login-brand"><span className="brand-mark">N</span><strong>Nhà Trọ 365</strong></div>
        <div><p className="eyebrow">QUẢN LÝ NHẸ NHÀNG</p><h1>Mọi khu trọ.<br />Một nơi quản lý.</h1><p>Theo dõi phòng, người thuê và dòng tiền rõ ràng mỗi ngày.</p></div>
        <small>© 2026 Nhà Trọ 365</small>
      </section>
      <section className="login-side">
        <div className="login-card">
          <p className="eyebrow">XIN CHÀO</p><h2>Đăng nhập hệ thống</h2><p>Sử dụng tài khoản được cấp để tiếp tục.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
