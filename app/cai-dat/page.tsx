import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Dashboard from "../Dashboard";
import { verifySessionToken } from "../../lib/auth";

export default async function SettingsPage() {
  const session = verifySessionToken((await cookies()).get("hm_session")?.value);
  if (!session) redirect("/login");
  if (session.role !== "landlord") redirect("/");
  return <Dashboard initialNav="Cài đặt" />;
}
