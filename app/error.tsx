"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="login-page">
      <section className="login-card glass">
        <AlertTriangle size={30} color="var(--sun-400)" aria-hidden="true" />
        <p className="eyebrow">Da Nang 360 Explorer</p>
        <h1>Không gian tạm gián đoạn</h1>
        <p>
          The experience encountered an unexpected error. Your scene selection
          is still available in the address bar.
        </p>
        <button className="primary-button" type="button" onClick={reset}>
          <RotateCcw size={18} aria-hidden="true" />
          Thử lại / Try again
        </button>
      </section>
    </main>
  );
}
