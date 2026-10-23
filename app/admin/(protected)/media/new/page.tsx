import { MediaForm } from "@/components/admin/forms/MediaForm";
import { prisma } from "@/lib/database/client";

export default async function NewMediaPage() {
  const scenes = await prisma.scene.findMany({
    orderBy: [{ tourId: "asc" }, { sortOrder: "asc" }],
    select: { id: true, titleEn: true },
  });

  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">Media metadata</p>
          <h1>New media</h1>
        </div>
      </header>
      <MediaForm scenes={scenes} />
    </>
  );
}
