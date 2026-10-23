import { notFound } from "next/navigation";

import { MediaForm } from "@/components/admin/forms/MediaForm";
import { prisma } from "@/lib/database/client";

export default async function EditMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [media, scenes] = await Promise.all([
    prisma.media.findUnique({ where: { id } }),
    prisma.scene.findMany({
      orderBy: [{ tourId: "asc" }, { sortOrder: "asc" }],
      select: { id: true, titleEn: true },
    }),
  ]);
  if (!media) notFound();

  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">Media metadata</p>
          <h1>Edit media</h1>
        </div>
      </header>
      <MediaForm
        id={media.id}
        scenes={scenes}
        initial={{
          sceneId: media.sceneId,
          type: media.type,
          url: media.url,
          thumbnailUrl: media.thumbnailUrl,
          titleVi: media.titleVi,
          titleEn: media.titleEn,
          attribution: media.attribution,
          sortOrder: media.sortOrder,
        }}
      />
    </>
  );
}
