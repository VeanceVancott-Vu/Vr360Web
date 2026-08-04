export type AnalyticsPreference =
  "unknown" | "granted" | "denied" | "privacy-signal";

export type StoredAnalyticsPreference = "granted" | "denied";

const CONSENT_KEY = "dn360-analytics-consent";
const SESSION_KEY = "dn360-analytics-session";
const PREFERENCE_EVENT = "dn360:analytics-preference";

type PrivacyNavigator = Navigator & { globalPrivacyControl?: boolean };
type PrivacyWindow = Window & { doNotTrack?: string | null };

export function browserPrivacySignalActive(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const privacyNavigator = navigator as PrivacyNavigator;
  const privacyWindow = window as PrivacyWindow;
  const doNotTrackValues = new Set(["1", "yes"]);
  return (
    privacyNavigator.globalPrivacyControl === true ||
    doNotTrackValues.has(privacyNavigator.doNotTrack ?? "") ||
    doNotTrackValues.has(privacyWindow.doNotTrack ?? "")
  );
}

export function getAnalyticsPreference(): AnalyticsPreference {
  if (typeof window === "undefined") return "unknown";
  if (browserPrivacySignalActive()) return "privacy-signal";

  try {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    return stored === "granted" || stored === "denied" ? stored : "unknown";
  } catch {
    return "unknown";
  }
}

export function getServerAnalyticsPreference(): AnalyticsPreference {
  return "unknown";
}

export function subscribeAnalyticsPreference(
  onStoreChange: () => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handlePreference = () => onStoreChange();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === CONSENT_KEY) onStoreChange();
  };
  window.addEventListener(PREFERENCE_EVENT, handlePreference);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(PREFERENCE_EVENT, handlePreference);
    window.removeEventListener("storage", handleStorage);
  };
}

export function setAnalyticsPreference(
  preference: StoredAnalyticsPreference,
): void {
  if (typeof window === "undefined") return;

  try {
    const safePreference = browserPrivacySignalActive() ? "denied" : preference;
    window.localStorage.setItem(CONSENT_KEY, safePreference);
    if (safePreference === "denied") {
      clearAnalyticsSessionToken();
    }
  } catch {
    // Storage can be unavailable in hardened browsers. Failing closed keeps
    // analytics disabled because the preference remains unknown.
  }
  window.dispatchEvent(new Event(PREFERENCE_EVENT));
}

export function clearAnalyticsSessionToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Session storage can be unavailable in hardened browsers.
  }
}

function randomSessionToken(): string | null {
  if (typeof crypto === "undefined") return null;
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replaceAll("-", "");
  }
  if (typeof crypto.getRandomValues !== "function") return null;

  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function analyticsSessionToken(): string | null {
  if (typeof window === "undefined" || getAnalyticsPreference() !== "granted") {
    clearAnalyticsSessionToken();
    return null;
  }

  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const created = randomSessionToken();
    if (!created) return null;
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return null;
  }
}
