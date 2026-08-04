export function SceneTransitionOverlay({
  active,
  title,
  loadingLabel,
}: {
  active: boolean;
  title: string;
  loadingLabel: string;
}) {
  return (
    <div
      className="scene-transition"
      data-active={active}
      aria-hidden={!active}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div>
        <span>360° · {loadingLabel}</span>
        <strong>{title}</strong>
      </div>
    </div>
  );
}
