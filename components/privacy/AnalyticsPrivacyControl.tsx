"use client";

import { ShieldCheck, X } from "lucide-react";

import { useDialogFocus } from "@/lib/accessibility/use-dialog-focus";
import type {
  AnalyticsPreference,
  StoredAnalyticsPreference,
} from "@/lib/analytics/privacy";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface AnalyticsPrivacyControlProps {
  dictionary: Dictionary;
  preference: AnalyticsPreference;
  settingsOpen: boolean;
  onChange: (preference: StoredAnalyticsPreference) => void;
  onCloseSettings: () => void;
}

function PreferenceActions({
  dictionary,
  preference,
  onChange,
}: Pick<
  AnalyticsPrivacyControlProps,
  "dictionary" | "preference" | "onChange"
>) {
  if (preference === "privacy-signal") return null;
  return (
    <div className="privacy-actions">
      <button
        type="button"
        className="secondary-button"
        onClick={() => onChange("granted")}
      >
        {dictionary.analyticsAllow}
      </button>
      <button
        type="button"
        className="secondary-button"
        onClick={() => onChange("denied")}
      >
        {dictionary.analyticsDecline}
      </button>
    </div>
  );
}

function PrivacySettingsDialog({
  dictionary,
  preference,
  onChange,
  onCloseSettings,
}: Omit<AnalyticsPrivacyControlProps, "settingsOpen">) {
  const dialogRef = useDialogFocus<HTMLElement>(onCloseSettings);
  const status =
    preference === "granted"
      ? dictionary.analyticsStatusAllowed
      : preference === "denied"
        ? dictionary.analyticsStatusDenied
        : preference === "privacy-signal"
          ? dictionary.analyticsStatusSignal
          : dictionary.analyticsStatusUnknown;

  return (
    <>
      <button
        type="button"
        className="dialog-backdrop privacy-backdrop"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onCloseSettings}
      />
      <section
        ref={dialogRef}
        className="privacy-dialog glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="analytics-settings-title"
        aria-describedby="analytics-settings-description analytics-settings-status"
        tabIndex={-1}
      >
        <header className="privacy-dialog__header">
          <div>
            <span className="eyebrow">{dictionary.privacy}</span>
            <h2 id="analytics-settings-title">
              {dictionary.analyticsSettings}
            </h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label={dictionary.close}
            onClick={onCloseSettings}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <p id="analytics-settings-description">
          {dictionary.analyticsDescription}
        </p>
        <p
          id="analytics-settings-status"
          className="privacy-status"
          role="status"
        >
          {status}
        </p>
        <PreferenceActions
          dictionary={dictionary}
          preference={preference}
          onChange={onChange}
        />
      </section>
    </>
  );
}

export function AnalyticsPrivacyControl({
  dictionary,
  preference,
  settingsOpen,
  onChange,
  onCloseSettings,
}: AnalyticsPrivacyControlProps) {
  return (
    <>
      {preference === "unknown" && !settingsOpen ? (
        <section
          className="privacy-banner glass"
          role="region"
          aria-labelledby="analytics-consent-title"
        >
          <div>
            <span className="privacy-heading-icon" aria-hidden="true">
              <ShieldCheck size={18} />
            </span>
            <h2 id="analytics-consent-title">{dictionary.analyticsTitle}</h2>
            <p>{dictionary.analyticsDescription}</p>
          </div>
          <PreferenceActions
            dictionary={dictionary}
            preference={preference}
            onChange={onChange}
          />
        </section>
      ) : null}

      {settingsOpen ? (
        <PrivacySettingsDialog
          dictionary={dictionary}
          preference={preference}
          onChange={onChange}
          onCloseSettings={onCloseSettings}
        />
      ) : null}
    </>
  );
}
