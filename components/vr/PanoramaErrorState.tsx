import { AlertTriangle, RotateCcw } from "lucide-react";

import type { Dictionary } from "@/lib/i18n/dictionaries";

export function PanoramaErrorState({
  dictionary,
  message,
  onRetry,
}: {
  dictionary: Dictionary;
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="panorama-error" role="alert">
      <div className="panorama-error__card glass">
        <AlertTriangle size={30} color="var(--sun-400)" aria-hidden="true" />
        <strong>{dictionary.panoramaError}</strong>
        <p>{message}</p>
        <button className="secondary-button" type="button" onClick={onRetry}>
          <RotateCcw size={16} aria-hidden="true" />
          {dictionary.retry}
        </button>
      </div>
    </div>
  );
}
