import { beforeEach, describe, expect, it, vi } from "vitest";

const seedMocks = vi.hoisted(() => ({
  hash: vi.fn(),
  userUpsert: vi.fn(),
  categoryUpsert: vi.fn(),
  tourUpsert: vi.fn(),
  tourUpdate: vi.fn(),
  sceneUpsert: vi.fn(),
  hotspotUpsert: vi.fn(),
  mediaUpsert: vi.fn(),
  floorPlanFindFirst: vi.fn(),
  floorPlanUpsert: vi.fn(),
  floorPlanMarkerUpsert: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  hash: seedMocks.hash,
}));

vi.mock("@/lib/database/client", () => {
  const floorPlan = {
    findFirst: seedMocks.floorPlanFindFirst,
    upsert: seedMocks.floorPlanUpsert,
  };

  return {
    prisma: {
      user: { upsert: seedMocks.userUpsert },
      category: { upsert: seedMocks.categoryUpsert },
      tour: {
        upsert: seedMocks.tourUpsert,
        update: seedMocks.tourUpdate,
      },
      scene: { upsert: seedMocks.sceneUpsert },
      hotspot: { upsert: seedMocks.hotspotUpsert },
      media: { upsert: seedMocks.mediaUpsert },
      floorPlan,
      floorPlanMarker: { upsert: seedMocks.floorPlanMarkerUpsert },
      $transaction: async (
        callback: (transaction: { floorPlan: typeof floorPlan }) => unknown,
      ) => callback({ floorPlan }),
      $disconnect: vi.fn(),
    },
  };
});

import { demoTour } from "@/lib/demo-data";
import { seed } from "@/prisma/seed";

describe("database seed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedMocks.hash.mockResolvedValue("hashed-password");
    seedMocks.floorPlanFindFirst.mockResolvedValue(null);
  });

  it("reproduces bundled relationships and assigns the default scene last", async () => {
    const hotspots = demoTour.scenes.flatMap((scene) => scene.hotspots);
    const media = demoTour.scenes.flatMap((scene) => scene.media);
    const floorPlans = demoTour.floorPlans ?? [];
    const markers = floorPlans.flatMap((plan) => plan.markers);

    await seed({
      ADMIN_SEED_EMAIL: "admin@example.com",
      ADMIN_SEED_PASSWORD: "initial-password",
    });

    expect(seedMocks.categoryUpsert).toHaveBeenCalledTimes(
      demoTour.categories.length,
    );
    expect(seedMocks.sceneUpsert).toHaveBeenCalledTimes(demoTour.scenes.length);
    expect(seedMocks.hotspotUpsert).toHaveBeenCalledTimes(hotspots.length);
    expect(seedMocks.mediaUpsert).toHaveBeenCalledTimes(media.length);
    expect(seedMocks.floorPlanUpsert).toHaveBeenCalledTimes(floorPlans.length);
    expect(seedMocks.floorPlanMarkerUpsert).toHaveBeenCalledTimes(
      markers.length,
    );

    expect(
      seedMocks.hotspotUpsert.mock.calls.map(([input]) => input.create),
    ).toEqual(hotspots);
    expect(
      seedMocks.floorPlanMarkerUpsert.mock.calls.map(([input]) => input.create),
    ).toEqual(markers);

    const lastSceneCall = Math.max(
      ...seedMocks.sceneUpsert.mock.invocationCallOrder,
    );
    const firstHotspotCall = Math.min(
      ...seedMocks.hotspotUpsert.mock.invocationCallOrder,
    );
    const lastMarkerCall = Math.max(
      ...seedMocks.floorPlanMarkerUpsert.mock.invocationCallOrder,
    );
    const defaultSceneCall = seedMocks.tourUpdate.mock.invocationCallOrder[0]!;

    expect(lastSceneCall).toBeLessThan(firstHotspotCall);
    expect(lastMarkerCall).toBeLessThan(defaultSceneCall);
    expect(seedMocks.tourUpdate).toHaveBeenCalledWith({
      where: { id: demoTour.id },
      data: { defaultSceneId: demoTour.defaultSceneId },
    });
  });

  it("uses stable upserts on reruns and rotates the configured admin password", async () => {
    seedMocks.hash
      .mockResolvedValueOnce("first-password-hash")
      .mockResolvedValueOnce("second-password-hash");

    await seed({
      ADMIN_SEED_EMAIL: "  ADMIN@EXAMPLE.COM ",
      ADMIN_SEED_PASSWORD: "first-password",
    });
    await seed({
      ADMIN_SEED_EMAIL: "admin@example.com",
      ADMIN_SEED_PASSWORD: "second-password",
    });

    expect(seedMocks.userUpsert).toHaveBeenNthCalledWith(1, {
      where: { email: "admin@example.com" },
      update: { passwordHash: "first-password-hash", role: "ADMIN" },
      create: {
        email: "admin@example.com",
        passwordHash: "first-password-hash",
        role: "ADMIN",
      },
    });
    expect(seedMocks.userUpsert).toHaveBeenNthCalledWith(2, {
      where: { email: "admin@example.com" },
      update: { passwordHash: "second-password-hash", role: "ADMIN" },
      create: {
        email: "admin@example.com",
        passwordHash: "second-password-hash",
        role: "ADMIN",
      },
    });

    const stableResources = [
      [
        seedMocks.categoryUpsert,
        demoTour.categories.map((category) => category.id),
      ],
      [seedMocks.tourUpsert, [demoTour.id]],
      [seedMocks.sceneUpsert, demoTour.scenes.map((scene) => scene.id)],
      [
        seedMocks.hotspotUpsert,
        demoTour.scenes.flatMap((scene) =>
          scene.hotspots.map((hotspot) => hotspot.id),
        ),
      ],
      [
        seedMocks.floorPlanUpsert,
        (demoTour.floorPlans ?? []).map((plan) => plan.id),
      ],
      [
        seedMocks.floorPlanMarkerUpsert,
        (demoTour.floorPlans ?? []).flatMap((plan) =>
          plan.markers.map((marker) => marker.id),
        ),
      ],
    ] as const;

    for (const [upsert, expectedIds] of stableResources) {
      expect(upsert.mock.calls.map(([input]) => input.where.id)).toEqual([
        ...expectedIds,
        ...expectedIds,
      ]);
    }
    expect(seedMocks.tourUpdate).toHaveBeenCalledTimes(2);
  });

  it("preserves a custom default when the demo floor plan is recreated", async () => {
    const defaultPlan = (demoTour.floorPlans ?? []).find(
      (plan) => plan.isDefault,
    );
    expect(defaultPlan).toBeDefined();

    seedMocks.floorPlanFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "custom-default-plan" });

    await seed({
      ADMIN_SEED_EMAIL: "admin@example.com",
      ADMIN_SEED_PASSWORD: "initial-password",
    });
    await seed({
      ADMIN_SEED_EMAIL: "admin@example.com",
      ADMIN_SEED_PASSWORD: "rotated-password",
    });

    const defaultPlanUpserts = seedMocks.floorPlanUpsert.mock.calls.filter(
      ([input]) => input.where.id === defaultPlan!.id,
    );
    expect(defaultPlanUpserts).toHaveLength(2);
    expect(defaultPlanUpserts[0]![0].create.isDefault).toBe(true);
    expect(defaultPlanUpserts[1]![0].create.isDefault).toBe(false);
    expect(seedMocks.floorPlanFindFirst).toHaveBeenLastCalledWith({
      where: {
        tourId: defaultPlan!.tourId,
        isDefault: true,
        id: { not: defaultPlan!.id },
      },
      select: { id: true },
    });
  });
});
