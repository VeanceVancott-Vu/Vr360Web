"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminRequest } from "@/lib/api/admin-client";

interface ResourceRow {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
}

export function ResourceTable({
  resource,
  rows,
  editBase,
}: {
  resource: "tours" | "scenes" | "hotspots" | "categories" | "media";
  rows: ResourceRow[];
  editBase?: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function remove(row: ResourceRow) {
    const confirmed = window.confirm(
      `Delete “${row.title}”? Related records may prevent this action.`,
    );
    if (!confirmed) return;
    setBusyId(row.id);
    setMessage(null);
    try {
      await adminRequest<unknown>(`/api/admin/${resource}/${row.id}`, {
        method: "DELETE",
      });
      router.refresh();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="admin-card">
      {message ? (
        <p className="field-error" role="alert">
          {message}
        </p>
      ) : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Record</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <strong>{row.title}</strong>
                {row.subtitle ? (
                  <small style={{ display: "block", color: "var(--muted)" }}>
                    {row.subtitle}
                  </small>
                ) : null}
              </td>
              <td>{row.status ?? "—"}</td>
              <td>
                <div style={{ display: "flex", gap: ".5rem" }}>
                  {editBase ? (
                    <Link
                      className="icon-button"
                      href={`${editBase}/${row.id}`}
                      aria-label={`Edit ${row.title}`}
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </Link>
                  ) : null}
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Delete ${row.title}`}
                    disabled={busyId === row.id}
                    onClick={() => void remove(row)}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3}>No records yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}
