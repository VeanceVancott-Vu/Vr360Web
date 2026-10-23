
"use client";

import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Compass,
  Headphones,
  MapPin,
  MapPinned,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Language, TourDto } from "@/lib/types";

export function TourWelcomeScreen({
  tour,
  tours = [tour],
}: {
  tour: TourDto;
  tours?: TourDto[];
}) {
  const [language, setLanguage] = useState<Language>("vi");
  const [selectedSlug, setSelectedSlug] = useState(tour.slug);
  const [isTourMenuOpen, setIsTourMenuOpen] = useState(false);

  useEffect(() => {
    const synchronize = window.setTimeout(() => {
      const saved = localStorage.getItem("dn360-language");
      const nextLanguage = saved === "en" ? "en" : "vi";

      setLanguage(nextLanguage);
      document.documentElement.lang = nextLanguage;
    }, 0);

    return () => window.clearTimeout(synchronize);
  }, []);

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    localStorage.setItem("dn360-language", nextLanguage);
    document.documentElement.lang = nextLanguage;
  }

  function selectTour(slug: string) {
    setSelectedSlug(slug);
    setIsTourMenuOpen(false);
  }

  const selectedTour =
    tours.find((item) => item.slug === selectedSlug) ?? tour;

  const dictionary = getDictionary(language);

  const title =
    language === "vi" ? selectedTour.titleVi : selectedTour.titleEn;

  const description =
    (
      language === "vi"
        ? selectedTour.descriptionVi
        : selectedTour.descriptionEn
    ).trim() || dictionary.welcomeDescription;

  const sceneCount =
    selectedTour.sceneCount ?? selectedTour.scenes.length;

  const imageUrl =
    selectedTour.welcomeImageUrl || selectedTour.coverImageUrl;

  const isVietnamese = language === "vi";

  return (
    <main className="welcome">
      <div className="welcome__image" key={selectedTour.slug}>
        <Image
          src={imageUrl}
          alt=""
          fill
          priority
          sizes="100vw"
        />
      </div>

      <div className="welcome__veil" />
      <div className="welcome__grain" />

      <header className="welcome__topbar">
        <Link href="/" className="brand" aria-label={dictionary.brand}>
          <span className="brand__mark">
            <Compass size={20} aria-hidden="true" />
          </span>
          <span>{dictionary.brand}</span>
        </Link>

        <LanguageSwitcher
          language={language}
          onChange={changeLanguage}
        />
      </header>

      <section
        className="welcome__content"
        aria-labelledby="welcome-title"
      >
        <p className="eyebrow">{dictionary.eyebrow}</p>

        {tours.length > 1 && (
          <div
            className="welcome__tour-picker"
            onBlur={(event) => {
              const nextTarget = event.relatedTarget;

              if (
                !(nextTarget instanceof Node) ||
                !event.currentTarget.contains(nextTarget)
              ) {
                setIsTourMenuOpen(false);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsTourMenuOpen(false);
              }
            }}
          >
            <button
              type="button"
              className="welcome__tour-picker-trigger"
              aria-label={
                isVietnamese ? "Chọn hành trình" : "Choose a tour"
              }
              aria-expanded={isTourMenuOpen}
              aria-controls="welcome-tour-options"
              onClick={() =>
                setIsTourMenuOpen((previous) => !previous)
              }
            >
              <span className="welcome__tour-picker-icon">
                <MapPin size={21} aria-hidden="true" />
              </span>

              <span className="welcome__tour-picker-copy">
                <span className="welcome__tour-picker-label">
                  {isVietnamese
                    ? "HÀNH TRÌNH ĐANG CHỌN"
                    : "SELECTED TOUR"}
                </span>

                <span className="welcome__tour-picker-title">
                  {title}
                </span>

                <span className="welcome__tour-picker-subtitle">
                  {String(sceneCount).padStart(2, "0")}{" "}
                  {dictionary.scenes}
                </span>
              </span>

              <ChevronDown
                className="welcome__tour-picker-chevron"
                size={20}
                aria-hidden="true"
              />
            </button>

            <div
              id="welcome-tour-options"
              className="welcome__tour-menu"
              role="group"
              aria-label={
                isVietnamese
                  ? "Các hành trình có sẵn"
                  : "Available tours"
              }
              hidden={!isTourMenuOpen}
            >
              {tours.map((option) => {
                const optionTitle =
                  language === "vi"
                    ? option.titleVi
                    : option.titleEn;

                const optionCount =
                  option.sceneCount ?? option.scenes.length;

                const isSelected =
                  option.slug === selectedTour.slug;

                return (
                  <button
                    key={option.slug}
                    type="button"
                    className="welcome__tour-option"
                    aria-pressed={isSelected}
                    onClick={() => selectTour(option.slug)}
                  >
                    <span className="welcome__tour-option-image">
                      <Image
                        src={
                          option.coverImageUrl ||
                          option.welcomeImageUrl
                        }
                        alt=""
                        fill
                        sizes="56px"
                      />
                    </span>

                    <span className="welcome__tour-option-copy">
                      <span className="welcome__tour-option-title">
                        {optionTitle}
                      </span>

                      <span className="welcome__tour-option-subtitle">
                        {String(optionCount).padStart(2, "0")}{" "}
                        {dictionary.scenes}
                      </span>
                    </span>

                    {isSelected && (
                      <Check
                        size={19}
                        aria-label={
                          isVietnamese
                            ? "Đang chọn"
                            : "Selected"
                        }
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <h1 id="welcome-title">{title}</h1>

        <p className="welcome__lead">{description}</p>

        <div className="welcome__actions">
          <Link
            className="primary-button"
            href={`/tour/${selectedTour.slug}?lang=${language}`}
          >
            {dictionary.start}
            <ArrowUpRight size={19} aria-hidden="true" />
          </Link>

          <span className="secondary-button" aria-hidden="true">
            <span>{String(sceneCount).padStart(2, "0")}</span>
            {dictionary.scenes}
          </span>
        </div>

        <div className="welcome__meta">
          <span>
            <MapPinned size={14} aria-hidden="true" /> Open map
            navigation
          </span>
          <span>
            <Headphones size={14} aria-hidden="true" /> Bilingual
            narration ready
          </span>
          <span>{dictionary.developmentAsset}</span>
        </div>
      </section>
    </main>
  );
}
