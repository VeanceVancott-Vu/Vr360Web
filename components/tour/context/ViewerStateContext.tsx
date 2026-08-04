"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import type { Language } from "@/lib/types";

export interface ViewerState {
  activeSceneId: string;
  activeSceneTitle: string;
  language: Language;
  transitioning: boolean;
}

const ViewerStateContext = createContext<ViewerState | null>(null);

export function ViewerStateProvider({
  value,
  children,
}: {
  value: ViewerState;
  children: ReactNode;
}) {
  const contextValue = useMemo(
    () => ({
      activeSceneId: value.activeSceneId,
      activeSceneTitle: value.activeSceneTitle,
      language: value.language,
      transitioning: value.transitioning,
    }),
    [
      value.activeSceneId,
      value.activeSceneTitle,
      value.language,
      value.transitioning,
    ],
  );

  return (
    <ViewerStateContext.Provider value={contextValue}>
      {children}
    </ViewerStateContext.Provider>
  );
}

export function useViewerState() {
  const value = useContext(ViewerStateContext);
  if (!value) {
    throw new Error("useViewerState must be used within ViewerStateProvider.");
  }
  return value;
}

export function ViewerStatusAnnouncer() {
  const { activeSceneTitle, language } = useViewerState();

  return (
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {language === "vi"
        ? `Đã chuyển đến ${activeSceneTitle}`
        : `Scene changed to ${activeSceneTitle}`}
    </p>
  );
}
