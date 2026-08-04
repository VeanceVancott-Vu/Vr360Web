import { Activity, MapPin, PanelsTopLeft, RadioTower } from "lucide-react";

import { prisma } from "@/lib/database/client";

async function dashboardData() {
  try {
    const [tours, scenes, hotspots, publishedScenes, recent] =
      await Promise.all([
        prisma.tour.count(),
        prisma.scene.count(),
        prisma.hotspot.count(),
        prisma.scene.count({ where: { isPublished: true } }),
        prisma.scene.findMany({
          orderBy: { updatedAt: "desc" },
          take: 6,
          select: {
            id: true,
            titleVi: true,
            titleEn: true,
            isPublished: true,
            updatedAt: true,
          },
        }),
      ]);
    return { tours, scenes, hotspots, publishedScenes, recent };
  } catch (error: unknown) {
    console.error("Admin dashboard database query failed", error);
    return {
      tours: 0,
      scenes: 0,
      hotspots: 0,
      publishedScenes: 0,
      recent: [],
    };
  }
}

export default async function AdminDashboardPage() {
  const data = await dashboardData();
  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">Content operations</p>
          <h1>Dashboard</h1>
        </div>
      </header>
      <section className="admin-grid" aria-label="Content statistics">
        {[
          { label: "Tours", value: data.tours, icon: PanelsTopLeft },
          { label: "Scenes", value: data.scenes, icon: MapPin },
          { label: "Hotspots", value: data.hotspots, icon: RadioTower },
          {
            label: "Published scenes",
            value: data.publishedScenes,
            icon: Activity,
          },
        ].map((item) => (
          <article className="stat-card" key={item.label}>
            <item.icon size={19} color="var(--sea-400)" aria-hidden="true" />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>
      <section className="admin-card" style={{ marginTop: "1rem" }}>
        <h2>Recently edited scenes</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Scene</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {data.recent.map((scene) => (
              <tr key={scene.id}>
                <td>
                  {scene.titleVi}
                  <small style={{ display: "block", color: "var(--muted)" }}>
                    {scene.titleEn}
                  </small>
                </td>
                <td>{scene.isPublished ? "Published" : "Draft"}</td>
                <td>{scene.updatedAt.toLocaleDateString("en-GB")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
