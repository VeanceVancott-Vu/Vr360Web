import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getAdminSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <div className="admin-shell">
      <AdminSidebar email={session.email} />
      <main className="admin-main">{children}</main>
    </div>
  );
}
