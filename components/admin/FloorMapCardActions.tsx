"use client";

import { Edit3, Settings, Trash2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { FloorPlanDto } from "@/lib/types";

export function FloorMapCardActions({ plan }: { plan: FloorPlanDto }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [titleVi, setTitleVi] = useState(plan.titleVi);
  const [titleEn, setTitleEn] = useState(plan.titleEn);
  const [imageUrl, setImageUrl] = useState(plan.imageUrl);
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const resData = (await response.json()) as {
        success: boolean;
        data?: { url: string };
        error?: { message: string };
      };

      if (resData.success && resData.data?.url) {
        setImageUrl(resData.data.url);
      } else {
        setErrorMsg(resData.error?.message || "File upload failed.");
      }
    } catch {
      setErrorMsg("An error occurred during file upload.");
    } finally {
      setUploading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`/api/admin/floor-plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId: plan.tourId,
          titleVi,
          titleEn,
          imageUrl,
          isDefault: plan.isDefault,
          sortOrder: plan.sortOrder,
        }),
      });

      if (response.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setErrorMsg("Failed to update floor plan.");
      }
    } catch {
      setErrorMsg("An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Are you sure you want to delete "${plan.titleVi}"? All associated markers will be deleted.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/floor-plans/${plan.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert("Failed to delete floor plan.");
      }
    } catch {
      alert("An error occurred while deleting.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          width: "100%",
        }}
      >
        <Link
          href={`/admin/maps/${plan.id}`}
          className="primary-button"
          style={{ width: "100%", justifyContent: "center" }}
        >
          <Settings size={16} aria-hidden="true" /> Open Studio & Markers
        </Link>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.5rem",
          }}
        >
          <button
            type="button"
            className="secondary-button"
            style={{ justifyContent: "center" }}
            onClick={() => setEditing(true)}
          >
            <Edit3 size={15} aria-hidden="true" /> Edit Details
          </button>

          <button
            type="button"
            className="secondary-button"
            style={{
              justifyContent: "center",
              color: "#f43f5e",
              borderColor: "rgba(244, 63, 94, 0.4)",
            }}
            disabled={deleting}
            onClick={() => void handleDelete()}
          >
            <Trash2 size={15} aria-hidden="true" />{" "}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {/* Edit Floor Plan Modal Dialog */}
      {editing ? (
        <>
          <button
            type="button"
            className="dialog-backdrop"
            onClick={() => setEditing(false)}
          />
          <div
            className="glass"
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "90%",
              maxWidth: "32rem",
              padding: "1.5rem",
              borderRadius: "1rem",
              border: "1px solid var(--glass-border)",
              zIndex: 100,
              boxShadow: "0 16px 48px rgba(0, 0, 0, 0.6)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0 }}>Edit Floor Plan Details</h3>
              <button
                type="button"
                className="icon-button"
                onClick={() => setEditing(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleUpdate}
              className="admin-form"
              style={{ marginTop: "1rem" }}
            >
              <div className="field">
                <label>
                  <span>Vietnamese Title</span>
                  <input
                    value={titleVi}
                    onChange={(e) => setTitleVi(e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="field">
                <label>
                  <span>English Title</span>
                  <input
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="field field--full">
                <label>
                  <span>Upload New Floor Plan Image</span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      background: "rgba(6, 21, 34, 0.8)",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px stroke var(--glass-border)",
                    }}
                  >
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                      id={`edit-file-input-${plan.id}`}
                    />
                    <label
                      htmlFor={`edit-file-input-${plan.id}`}
                      className="secondary-button"
                      style={{ cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      <Upload size={15} />{" "}
                      {uploading ? "Uploading..." : "Upload Image File"}
                    </label>
                  </div>
                </label>
              </div>

              <div className="field field--full">
                <label>
                  <span>Floor Plan Image URL</span>
                  <input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    required
                  />
                </label>
              </div>

              {errorMsg ? (
                <p
                  className="field-error"
                  style={{ gridColumn: "1 / -1", margin: 0 }}
                >
                  {errorMsg}
                </p>
              ) : null}

              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  gap: "0.75rem",
                  marginTop: "0.5rem",
                }}
              >
                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving || uploading}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      ) : null}
    </>
  );
}
