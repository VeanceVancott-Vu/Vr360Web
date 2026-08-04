import { Compass } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata = { title: "Administrator sign in" };

export default function AdminLoginPage() {
  return (
    <main className="login-page">
      <section className="login-card glass">
        <Link href="/" className="brand">
          <span className="brand__mark">
            <Compass size={20} aria-hidden="true" />
          </span>
          <span>Da Nang 360 Explorer</span>
        </Link>
        <p className="eyebrow">Protected workspace</p>
        <h1>Administrator</h1>
        <p style={{ color: "var(--muted)" }}>
          Use the account created by the environment-driven seed script. Demo
          credentials are never stored in source control.
        </p>
        <Suspense>
          <AdminLoginForm />
        </Suspense>
      </section>
    </main>
  );
}
