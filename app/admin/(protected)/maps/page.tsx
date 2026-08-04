import { AdminFloorPlanForm } from "@/components/admin/forms/AdminFloorPlanForm";
import { FloorMapCardActions } from "@/components/admin/editors/FloorMapCardActions";
import { prisma } from "@/lib/database/client";

export default async function AdminFloorMapsPage() {
  const floorPlansData = prisma.floorPlan
    ? await prisma.floorPlan.findMany({
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        include: {
          tour: { select: { titleVi: true, titleEn: true } },
          markers: { select: { id: true, floorPlanId: true, sceneId: true, x: true, y: true, labelVi: true, labelEn: true, icon: true, colorTheme: true } },
        },
      })
    : [];

  const floorPlans = floorPlansData.map((plan) => ({
    ...plan,
    markers: plan.markers.map((m) => ({
      ...m,
      labelVi: m.labelVi,
      labelEn: m.labelEn,
      icon: m.icon,
      colorTheme: m.colorTheme,
    })),
  }));

  const tours = await prisma.tour.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">Architectural Maps</p>
          <h1>Floor Maps Management</h1>
        </div>
      </header>

      <section className="admin-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))", gap: "1.5rem" }}>
        {floorPlans.map((plan) => (
          <div key={plan.id} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ position: "relative", width: "100%", height: "12rem", borderRadius: "0.75rem", overflow: "hidden", border: "1px solid var(--glass-border)", background: "#061522" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={plan.imageUrl}
                alt={plan.titleEn}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <span className="badge" style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "rgba(6, 21, 34, 0.85)", backdropFilter: "blur(6px)", border: "1px solid var(--glass-border)" }}>
                {plan.markers.length} Scene Markers
              </span>
            </div>

            <div>
              <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.25rem" }}>{plan.titleVi}</h3>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>{plan.titleEn}</p>
              <small style={{ display: "block", marginTop: "0.5rem", color: "var(--brand-glow)" }}>
                Tour: {plan.tour.titleVi}
              </small>
            </div>

            <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
              <FloorMapCardActions plan={plan} />
            </div>
          </div>
        ))}
      </section>

      <section className="admin-card" style={{ marginTop: "2rem" }}>
        <h2 style={{ marginTop: 0 }}>Add New Floor Plan Map</h2>
        <AdminFloorPlanForm tours={tours} />
      </section>
    </>
  );
}
