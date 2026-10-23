"use client";

import {
  Compass,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  PanelsTopLeft,
  Tags,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminRequest } from "@/lib/api/admin-client";

export function AdminSidebar({ email }: { email: string }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function signOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await adminRequest<unknown>("/api/auth/logout", { method: "POST" });
      router.replace("/admin/login");
      router.refresh();
    } catch (error: unknown) {
      setSignOutError(
        error instanceof Error ? error.message : "Unable to sign out.",
      );
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <aside className="admin-sidebar">
      <Link href="/" className="brand">
        <span className="brand__mark">
          <Compass size={19} aria-hidden="true" />
        </span>
        <span>DN360 Admin</span>
      </Link>
      <nav aria-label="Administrator">
        <Link href="/admin">
          <LayoutDashboard size={17} aria-hidden="true" /> Dashboard
        </Link>
        <Link href="/admin/tours">
          <PanelsTopLeft size={17} aria-hidden="true" /> Tours
        </Link>
        <Link href="/admin/scenes">
          <MapPin size={17} aria-hidden="true" /> Scenes
        </Link>
        <Link href="/admin/maps">
          <Map size={17} aria-hidden="true" /> Floor Maps
        </Link>
        <Link href="/admin/categories">
          <Tags size={17} aria-hidden="true" /> Categories
        </Link>
        <Link href="/admin/media">
          <ImageIcon size={17} aria-hidden="true" /> Media
        </Link>
      </nav>
      <div style={{ marginTop: "auto", paddingTop: "1.5rem" }}>
        <small style={{ display: "block", color: "var(--muted)" }}>
          {email}
        </small>
        {signOutError ? (
          <p className="field-error" role="alert">
            {signOutError}
          </p>
        ) : null}
        <button
          className="secondary-button"
          style={{ marginTop: "0.75rem" }}
          type="button"
          disabled={signingOut}
          onClick={() => void signOut()}
        >
          <LogOut size={16} aria-hidden="true" />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
