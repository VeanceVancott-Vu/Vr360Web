"use client";

import { X } from "lucide-react";
import Image from "next/image";

import { useDialogFocus } from "@/lib/accessibility/use-dialog-focus";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function ImageLightbox({
  imageUrl,
  title,
  dictionary,
  onClose,
}: {
  imageUrl: string;
  title: string;
  dictionary: Dictionary;
  onClose: () => void;
}) {
  const dialogRef = useDialogFocus<HTMLElement>(onClose);

  return (
    <>
      <button
        type="button"
        className="dialog-backdrop"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
      />
      <section
        ref={dialogRef}
        className="lightbox"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-lightbox-title"
        tabIndex={-1}
      >
        <h2 id="image-lightbox-title" className="sr-only">
          {title}
        </h2>
        <button
          className="icon-button"
          type="button"
          aria-label={dictionary.close}
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
        <div className="lightbox__image">
          <Image src={imageUrl} alt={title} fill sizes="100vw" />
        </div>
      </section>
    </>
  );
}
