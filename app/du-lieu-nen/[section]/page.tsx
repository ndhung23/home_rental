import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Dashboard from "../../Dashboard";
import { verifySessionToken } from "../../../lib/auth";

export const dynamic = "force-dynamic";

const sections = {
  "nha-tro": "Nhà trọ",
  "phong-tro": "Phòng trọ",
  "nguoi-thue": "Khách thuê",
} as const;

export default async function MasterDataPage({ params }: { params: Promise<{ section: string }> }) {
  const session = verifySessionToken((await cookies()).get("hm_session")?.value);
  if (!session) redirect("/login");
  const { section } = await params;
  const masterSection = sections[section as keyof typeof sections];
  if (!masterSection) notFound();
  return <Dashboard initialNav="Dữ liệu nền" initialMasterSection={masterSection} />;
}
