import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "leaflet/dist/leaflet.css";
import "pannellum/build/pannellum.css";
import "./globals.css";
import "./minimap.css";

export const metadata: Metadata = {
  title: {
    default: "Da Nang 360 Explorer",
    template: "%s · Da Nang 360 Explorer",
  },
  description:
    "An original bilingual VR360 tourism experience built with Next.js, Pannellum, and WebGL.",
  applicationName: "Da Nang 360 Explorer",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#04111f",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
