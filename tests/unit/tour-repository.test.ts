import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findCategories: vi.fn(),
  findFloorPlans: vi.fn(),
}));

vi.mock("@/lib/database/client", () => ({
  prisma: {
    tour: {
      findFirst: databaseMocks.findFirst,
    },
    category: {
      findMany: databaseMocks.findCategories,
    },
    floorPlan: {
      findMany: databaseMocks.findFloorPlans,
    },
  },
}));

import { demoFloorPlan, demoTour } from "@/lib/demo-data";
import {
  getPublishedTour,
  PublicDataUnavailableError,
} from "@/lib/repositories/tour-repository";

describe("tour repository publication boundary", () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "mysql://repository-test";
    databaseMocks.findFirst.mockResolvedValue(null);
    databaseMocks.findCategories.mockResolvedValue([]);
    databaseMocks.findFloorPlans.mockResolvedValue([]);
  });

  afterEach(() => {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });

  it("queries only published tours, scenes, and visible hotspots", async () => {
    await getPublishedTour("da-nang");

    expect(databaseMocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "da-nang", isPublished: true },
        include: expect.objectContaining({
          scenes: expect.objectContaining({
            where: { isPublished: true },
            include: expect.objectContaining({
              hotspots: expect.objectContaining({
                where: { isVisible: true },
              }),
            }),
          }),
        }),
      }),
    );
  });

  it("keeps bundled demo data available when tests have no database", async () => {
    delete process.env.DATABASE_URL;

    await expect(getPublishedTour(demoTour.slug)).resolves.toBe(demoTour);
    expect(databaseMocks.findFirst).not.toHaveBeenCalled();
  });

  it("returns the latest default uploaded plan and removes unpublished markers", async () => {
    databaseMocks.findFirst.mockResolvedValue({
      ...demoTour,
      scenes: demoTour.scenes,
    });
    databaseMocks.findCategories.mockResolvedValue(demoTour.categories);
    databaseMocks.findFloorPlans.mockResolvedValue([
      {
        ...demoFloorPlan,
        imageUrl: "/uploads/floor-plans/current-plan.jpg",
        markers: [
          ...demoFloorPlan.markers,
          {
            ...demoFloorPlan.markers[0],
            id: "draft-scene-marker",
            sceneId: "draft-scene",
          },
        ],
      },
    ]);

    const result = await getPublishedTour(demoTour.slug);

    expect(databaseMocks.findFloorPlans).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tourId: demoTour.id },
        orderBy: [
          { isDefault: "desc" },
          { updatedAt: "desc" },
          { sortOrder: "asc" },
        ],
      }),
    );
    expect(result?.floorPlans?.[0]?.imageUrl).toBe(
      "/uploads/floor-plans/current-plan.jpg",
    );
    expect(
      result?.floorPlans?.[0]?.markers.some(
        (marker) => marker.sceneId === "draft-scene",
      ),
    ).toBe(false);
  });

  it("does not substitute demo data after a configured database fails", async () => {
    databaseMocks.findFirst.mockRejectedValue(
      new Error("database intentionally unavailable"),
    );

    await expect(getPublishedTour(demoTour.slug)).rejects.toBeInstanceOf(
      PublicDataUnavailableError,
    );
  });
});
