"use client";

import { Compass, Map, Menu, Share2, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Language } from "@/lib/types";

interface TourHeaderProps {
  language: Language;
  dictionary: Dictionary;
  tourTitle: string;
  onLanguageChange: (language: Language) => void;
  sidebarOpen: boolean;
  mapOpen: boolean;
  privacyOpen: boolean;
  onMenu: (trigger: HTMLButtonElement) => void;
  onMap: () => void;
  onShare: () => void;
  onPrivacy: () => void;
}

export function TourHeader({
  language,
  dictionary,
  tourTitle,
  onLanguageChange,
  sidebarOpen,
  mapOpen,
  privacyOpen,
  onMenu,
  onMap,
  onShare,
  onPrivacy,
}: TourHeaderProps) {
  return (
    <header className="tour-header">
      <Link
        href="/"
        className="brand tour-header__brand glass"
        aria-label={dictionary.brand}
      >
        <span className="brand__mark">
          <Compass size={20} aria-hidden="true" />
        </span>
        <span className="tour-header__brand-text">
          {dictionary.brand}
          <span>{tourTitle}</span>
        </span>
      </Link>
      <nav
        className="tour-header__actions glass"
        aria-label={dictionary.tourTools}
      >
        <button
          className="tour-action tour-action--label"
          type="button"
          title={dictionary.openMenu}
          aria-label={dictionary.openMenu}
          aria-expanded={sidebarOpen}
          aria-controls="scene-sidebar"
          data-tooltip={dictionary.openMenu}
          onClick={(event) => onMenu(event.currentTarget)}
        >
          <Menu size={18} aria-hidden="true" />
          <span>{dictionary.scenes}</span>
        </button>
        <button
          className="tour-action tour-action--label"
          type="button"
          title={dictionary.map}
          aria-label={dictionary.map}
          aria-haspopup="dialog"
          aria-expanded={mapOpen}
          data-tooltip={dictionary.map}
          onClick={onMap}
        >
          <Map size={18} aria-hidden="true" />
          <span>{dictionary.map}</span>
        </button>
        <button
          className="tour-action desktop-action"
          type="button"
          title={dictionary.share}
          aria-label={dictionary.share}
          data-tooltip={dictionary.share}
          onClick={onShare}
        >
          <Share2 size={18} aria-hidden="true" />
        </button>
        <button
          className="tour-action"
          type="button"
          title={dictionary.privacy}
          aria-label={dictionary.privacy}
          aria-haspopup="dialog"
          aria-expanded={privacyOpen}
          data-tooltip={dictionary.privacy}
          onClick={onPrivacy}
        >
          <ShieldCheck size={18} aria-hidden="true" />
        </button>
        <LanguageSwitcher language={language} onChange={onLanguageChange} />
      </nav>
    </header>
  );
}
