import type { Dictionary } from "@/lib/i18n/dictionaries";

export function PanoramaLoadingOverlay({
  dictionary,
}: {
  dictionary: Dictionary;
}) {
  return (
    <div
      className="panorama-loading"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="panorama-loading__card glass">
        <span className="loader-orbit" aria-hidden="true" />
        <strong>{dictionary.loadingPanorama}</strong>
        <small>{dictionary.viewerHelp}</small>
      </div>
    </div>
  );
}
