"use client";

import { ArrowUpRight, Compass, Headphones, MapPinned } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Language, TourDto } from "@/lib/types";

export function TourWelcomeScreen({ tour }: { tour: TourDto }) {
  const [language, setLanguage] = useState<Language>("vi");

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

  const dictionary = getDictionary(language);
  const title = language === "vi" ? tour.titleVi : tour.titleEn;

  return (
    <main className="welcome">
      <div className="welcome__image">
        <Image src={tour.welcomeImageUrl} alt="" fill priority sizes="100vw" />
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
        <LanguageSwitcher language={language} onChange={changeLanguage} />
      </header>
      <section className="welcome__content" aria-labelledby="welcome-title">
        <p className="eyebrow">{dictionary.eyebrow}</p>
        <h1 id="welcome-title">{title}</h1>
        <p className="welcome__lead">{dictionary.welcomeDescription}</p>
        <div className="welcome__actions">
          <Link
            className="primary-button"
            href={`/tour/${tour.slug}?lang=${language}`}
          >
            {dictionary.start}
            <ArrowUpRight size={19} aria-hidden="true" />
          </Link>
          <span className="secondary-button" aria-hidden="true">
            <span>{String(tour.scenes.length).padStart(2, "0")}</span>
            {dictionary.scenes}
          </span>
        </div>
        <div className="welcome__meta">
          <span>
            <MapPinned size={14} aria-hidden="true" /> Open map navigation
          </span>
          <span>
            <Headphones size={14} aria-hidden="true" /> Bilingual narration
            ready
          </span>
          <span>{dictionary.developmentAsset}</span>
        </div>
      </section>
    </main>
  );
}
