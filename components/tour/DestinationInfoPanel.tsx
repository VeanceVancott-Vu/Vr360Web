"use client";

import { ExternalLink, X } from "lucide-react";
import Image from "next/image";

import { AudioNarrationPlayer } from "@/components/audio/AudioNarrationPlayer";
import { useDialogFocus } from "@/lib/accessibility/use-dialog-focus";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { HotspotDto, Language, SceneDto } from "@/lib/types";

interface DestinationInfoPanelProps {
  scene: SceneDto;
  hotspot: HotspotDto | null;
  language: Language;
  dictionary: Dictionary;
  onClose: () => void;
}

export function DestinationInfoPanel({
  scene,
  hotspot,
  language,
  dictionary,
  onClose,
}: DestinationInfoPanelProps) {
  const dialogRef = useDialogFocus<HTMLElement>(onClose);

  const title = hotspot
    ? language === "vi"
      ? hotspot.labelVi
      : hotspot.labelEn
    : language === "vi"
      ? scene.titleVi
      : scene.titleEn;
  const content = hotspot
    ? language === "vi"
      ? hotspot.contentVi
      : hotspot.contentEn
    : language === "vi"
      ? scene.fullDescriptionVi
      : scene.fullDescriptionEn;

  return (
    <>
      <button
        type="button"
        className="dialog-backdrop"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        ref={dialogRef}
        className="info-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-panel-title"
        tabIndex={-1}
      >
        <header className="info-panel__header">
          <span className="eyebrow">Story · 360°</span>
          <button
            className="icon-button"
            type="button"
            aria-label={dictionary.close}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <h2 id="info-panel-title">{title}</h2>
        {hotspot?.imageUrl ? (
          <div className="info-panel__image">
            <Image src={hotspot.imageUrl} alt={title} fill sizes="480px" />
          </div>
        ) : null}
        <p>{content}</p>
        {hotspot?.externalUrl ? (
          <a
            className="secondary-button"
            href={hotspot.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {dictionary.externalLink}
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        ) : null}
        {!hotspot ? (
          <AudioNarrationPlayer
            scene={scene}
            language={language}
            dictionary={dictionary}
          />
        ) : null}
        {scene.attribution ? (
          <small style={{ color: "var(--muted)" }}>{scene.attribution}</small>
        ) : null}
      </aside>
    </>
  );
}
