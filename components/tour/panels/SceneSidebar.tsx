"use client";

import { Check, ChevronRight, Search, X } from "lucide-react";
import Image from "next/image";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";

import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { CategoryDto, Language, SceneDto } from "@/lib/types";

interface SceneSidebarProps {
  open: boolean;
  language: Language;
  dictionary: Dictionary;
  categories: CategoryDto[];
  scenes: SceneDto[];
  activeSceneId: string;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onSelect: (scene: SceneDto) => void;
  onClose: () => void;
}

export function SceneSidebar({
  open,
  language,
  dictionary,
  categories,
  scenes,
  activeSceneId,
  returnFocusRef,
  onSelect,
  onClose,
}: SceneSidebarProps) {
  const [categoryId, setCategoryId] = useState<string>("all");
  const [query, setQuery] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const visibleScenes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return scenes.filter((scene) => {
      const inCategory =
        categoryId === "all" || scene.categoryId === categoryId;
      const text =
        language === "vi"
          ? `${scene.titleVi} ${scene.shortDescriptionVi}`
          : `${scene.titleEn} ${scene.shortDescriptionEn}`;
      return (
        inCategory &&
        (!normalized || text.toLocaleLowerCase().includes(normalized))
      );
    });
  }, [categoryId, language, query, scenes]);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      closeRef.current?.focus();
      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCloseRef.current();
        }
      };
      document.addEventListener("keydown", closeOnEscape);
      return () => document.removeEventListener("keydown", closeOnEscape);
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      returnFocusRef.current?.focus();
    }
  }, [open, returnFocusRef]);

  return (
    <aside
      id="scene-sidebar"
      className="scene-sidebar glass"
      data-open={open}
      aria-hidden={!open}
      inert={!open}
      aria-label={dictionary.scenes}
    >
      <div className="scene-sidebar__header">
        <div>
          <p className="eyebrow">{dictionary.explore}</p>
          <h2>{dictionary.scenes}</h2>
        </div>
        <button
          ref={closeRef}
          className="icon-button"
          type="button"
          aria-label={dictionary.close}
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="scene-sidebar__categories">
        <button
          className="category-chip"
          type="button"
          data-active={categoryId === "all"}
          aria-pressed={categoryId === "all"}
          onClick={() => setCategoryId("all")}
        >
          {dictionary.overview}
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            className="category-chip"
            type="button"
            data-active={categoryId === category.id}
            aria-pressed={categoryId === category.id}
            onClick={() => setCategoryId(category.id)}
          >
            {language === "vi" ? category.nameVi : category.nameEn}
          </button>
        ))}
      </div>
      <label className="scene-search">
        <Search size={16} aria-hidden="true" />
        <span className="sr-only">{dictionary.search}</span>
        <input
          type="search"
          placeholder={dictionary.searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p className="sr-only" role="status" aria-live="polite">
        {visibleScenes.length} {dictionary.searchResults}
      </p>
      <div className="scene-list">
        {visibleScenes.map((scene) => {
          const active = scene.id === activeSceneId;
          const category = categories.find(
            (item) => item.id === scene.categoryId,
          );
          return (
            <button
              key={scene.id}
              className="scene-card"
              data-active={active}
              type="button"
              aria-label={
                (language === "vi" ? scene.titleVi : scene.titleEn) +
                (active ? " — " + dictionary.currentLocation : "")
              }
              aria-current={active ? "location" : undefined}
              onClick={() => onSelect(scene)}
            >
              <span className="scene-card__image">
                <Image
                  src={scene.previewImageUrl}
                  alt=""
                  fill
                  sizes="76px"
                  loading={active ? "eager" : "lazy"}
                />
              </span>
              <span>
                <strong>
                  {language === "vi" ? scene.titleVi : scene.titleEn}
                </strong>
                <small>
                  {category
                    ? language === "vi"
                      ? category.nameVi
                      : category.nameEn
                    : dictionary.scenes}
                </small>
              </span>
              {active ? (
                <Check size={16} color="var(--sea-400)" aria-hidden="true" />
              ) : (
                <ChevronRight size={16} aria-hidden="true" />
              )}
            </button>
          );
        })}
        {visibleScenes.length === 0 ? (
          <p style={{ padding: "1rem", color: "var(--muted)" }}>
            {dictionary.noResults}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
