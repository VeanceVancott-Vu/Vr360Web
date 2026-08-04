import { Compass, Home } from "lucide-react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="login-page">
      <section className="login-card glass">
        <Compass size={32} color="var(--sea-400)" aria-hidden="true" />
        <p className="eyebrow">404 · Off the map</p>
        <h1>Điểm đến không tồn tại</h1>
        <p>
          We could not find this destination. Return to the welcome screen to
          choose another route.
        </p>
        <Link className="primary-button" href="/">
          <Home size={18} aria-hidden="true" />
          Về trang chủ / Home
        </Link>
      </section>
    </main>
  );
}
