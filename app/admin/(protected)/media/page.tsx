import { ResourceTable } from "@/components/admin/layout/ResourceTable";
import { prisma } from "@/lib/database/client";

export default async function AdminMediaPage() {
  const media = await prisma.media.findMany({
    orderBy: [{ sceneId: "asc" }, { sortOrder: "asc" }],
  });
  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">Media metadata</p>
          <h1>Media</h1>
        </div>
      </header>
      <p style={{ color: "var(--muted)" }}>
        This MVP stores media URLs and metadata. Production upload storage
        should be connected through the documented storage service interface.
      </p>
      <ResourceTable
        resource="media"
        rows={media.map((item) => ({
          id: item.id,
          title: item.titleVi,
          subtitle: `${item.titleEn} · ${item.url}`,
          status: item.type,
        }))}
      />
    </>
  );
}
