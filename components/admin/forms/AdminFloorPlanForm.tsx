"use client";

import { Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminRequest } from "@/lib/api/admin-client";
import type { TourDto } from "@/lib/types";

export function AdminFloorPlanForm({ tours }: { tours: Partial<TourDto>[] }) {
  const router = useRouter();
  const [tourId, setTourId] = useState(tours[0]?.id ?? "");
  const [titleVi, setTitleVi] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [imageUrl, setImageUrl] = useState(
    "/images/floor-plan-student-house.svg",
  );
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const upload = await adminRequest<{ url: string }>("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      setImageUrl(upload.url);
    } catch (error: unknown) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "An error occurred during file upload.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      await adminRequest<unknown>("/api/admin/floor-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId,
          titleVi,
          titleEn,
          imageUrl,
          isDefault: true,
          sortOrder: 1,
        }),
      });
      setTitleVi("");
      setTitleEn("");
      router.refresh();
    } catch (error: unknown) {
      setErrorMsg(
        error instanceof Error ? error.message : "An error occurred.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="admin-form"
      style={{ marginTop: "1rem" }}
    >
      <div className="field">
        <label>
          <span>Select Tour</span>
          <select
            value={tourId}
            onChange={(e) => setTourId(e.target.value)}
            required
          >
            {tours.map((tour) => (
              <option key={tour.id} value={tour.id}>
                {tour.titleVi} ({tour.titleEn})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field">
        <label>
          <span>Vietnamese Title (Tên Bản Đồ)</span>
          <input
            value={titleVi}
            onChange={(e) => setTitleVi(e.target.value)}
            placeholder="e.g. Sơ Đồ Tầng 1 - Khu Phòng Trọ"
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
            placeholder="e.g. 1st Floor Architectural Plan"
            required
          />
        </label>
      </div>

      {/* Upload File Section */}
      <div className="field field--full">
        <label>
          <span>Floor Plan Image File (PNG, JPG, or WebP; maximum 10 MB)</span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              background: "rgba(6, 21, 34, 0.8)",
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px stroke var(--glass-border)",
            }}
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileUpload}
              style={{ display: "none" }}
              id="floor-plan-upload-input"
            />
            <label
              htmlFor="floor-plan-upload-input"
              className="secondary-button"
              style={{ cursor: "pointer", whiteSpace: "nowrap" }}
            >
              <Upload size={16} aria-hidden="true" />{" "}
              {uploading ? "Uploading..." : "Choose Image File"}
            </label>

            <span
              style={{
                fontSize: "0.85rem",
                color: "var(--muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {imageUrl}
            </span>
          </div>
        </label>
      </div>

      <div className="field field--full">
        <label>
          <span>Or Direct Image URL</span>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://... or /images/floor-plan-student-house.svg"
            required
          />
        </label>
      </div>

      {errorMsg ? (
        <p className="field-error" style={{ gridColumn: "1 / -1", margin: 0 }}>
          {errorMsg}
        </p>
      ) : null}

      <div style={{ gridColumn: "1 / -1" }}>
        <button
          type="submit"
          className="primary-button"
          disabled={submitting || uploading}
        >
          <Plus size={17} aria-hidden="true" />{" "}
          {submitting ? "Creating..." : "Create Floor Plan"}
        </button>
      </div>
    </form>
  );
}
