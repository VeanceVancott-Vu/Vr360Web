
"use client";

import { useState } from "react";

type ImageUploadKind =
    | "cover"
    | "welcome"
    | "scene-preview"
    | "panorama";


type ImageUploadFieldProps = {
    label: string;
    kind: ImageUploadKind;
    tourSlug: string;
    value: string;
    onChange: (url: string) => void;
};

type UploadResponse =
    | {
        success: true;
        data: { url: string };
    }
    | {
        success: false;
        error?: { message?: string };
    };

export function ImageUploadField({
    label,
    kind,
    tourSlug,
    value,
    onChange,
}: ImageUploadFieldProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    async function uploadFile(file: File) {
        if (!tourSlug.trim()) {
            setError("Enter the tour slug before uploading.");
            return;
        }

        setUploading(true);
        setError("");

        try {
            const formData = new FormData();

            formData.set("file", file);
            formData.set("tourSlug", tourSlug.trim());
            formData.set("kind", kind);

            const response = await fetch(
                "/api/admin/upload",
                {
                    method: "POST",
                    body: formData,
                },
            );

            const result =
                (await response.json()) as UploadResponse;

            if (!response.ok || !result.success) {
                const message = !result.success
                    ? result.error?.message
                    : undefined;

                throw new Error(message ?? "Upload failed.");
            }

            onChange(result.data.url);
        } catch (uploadError) {
            setError(
                uploadError instanceof Error
                    ? uploadError.message
                    : "Unable to upload the image.",
            );
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="grid gap-3">
            <label className="grid gap-2 text-sm font-medium">
                {label}

                <input
                    type="text"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="/uploads/tours/your-tour/image.webp"
                    className="w-full rounded-lg border p-2"
                />
            </label>

            <label className="grid gap-2 text-sm">
                <span>Choose an image from your computer</span>

                <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading || !tourSlug.trim()}
                    onChange={(event) => {
                        const file = event.currentTarget.files?.[0];

                        // Allow selecting the same file again later.
                        event.currentTarget.value = "";

                        if (file) {
                            void uploadFile(file);
                        }
                    }}
                    className="block w-full text-sm"
                />
            </label>

            {!tourSlug.trim() && (
                <p className="text-sm text-amber-600">
                    Enter the tour slug first.
                </p>
            )}

            {uploading && (
                <p role="status" className="text-sm">
                    Uploading image...
                </p>
            )}

            {error && (
                <p role="alert" className="text-sm text-red-600">
                    {error}
                </p>
            )}

            {value && (
                <div className="grid gap-2">
                    <p className="text-sm text-green-700">
                        Image URL is ready. Save to store it.
                    </p>

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={value}
                        alt={`${label} preview`}
                        className="max-h-56 max-w-full rounded-lg border object-contain"
                    />
                </div>
            )}
        </div>
    );
}
