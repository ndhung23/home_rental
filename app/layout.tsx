import type { Metadata } from "next";
import { Be_Vietnam_Pro, Lora } from "next/font/google";
import "./globals.css";

const sans = Be_Vietnam_Pro({ variable: "--font-sans", subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700"] });
const display = Lora({ variable: "--font-display", subsets: ["latin", "vietnamese"], weight: ["600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://nhatro365.site"),
  title: "Nhà Trọ 365 — Quản lý nhà trọ nhẹ nhàng",
  description: "Quản lý phòng, khách thuê, điện nước, hóa đơn và công nợ trên một nền tảng duy nhất.",
  openGraph: {
    title: "Nhà Trọ 365",
    description: "Quản lý nhẹ nhàng. Thu tiền đúng hạn.",
    images: [{ url: "/og.png", width: 1792, height: 901, alt: "Nhà Trọ 365" }],
  },
  twitter: { card: "summary_large_image", title: "Nhà Trọ 365", description: "Quản lý nhẹ nhàng. Thu tiền đúng hạn.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${sans.variable} ${display.variable}`}>{children}</body>
    </html>
  );
}
