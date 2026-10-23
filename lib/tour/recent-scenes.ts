const RECENT_SCENES_KEY = "dn360-recent-scenes";
const MAX_RECENT_SCENES = 6;

type RecentSceneStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export function rememberRecentScene(
  storage: RecentSceneStorage,
  sceneId: string,
): void {
  let recentSceneIds: string[] = [];

  try {
    const storedValue = storage.getItem(RECENT_SCENES_KEY);
    if (storedValue !== null) {
      const parsed: unknown = JSON.parse(storedValue);
      if (Array.isArray(parsed)) {
        recentSceneIds = parsed.filter(
          (item): item is string => typeof item === "string",
        );
      }
    }
  } catch {
    try {
      storage.removeItem(RECENT_SCENES_KEY);
    } catch {
      return;
    }
  }

  try {
    storage.setItem(
      RECENT_SCENES_KEY,
      JSON.stringify(
        [sceneId, ...recentSceneIds.filter((id) => id !== sceneId)].slice(
          0,
          MAX_RECENT_SCENES,
        ),
      ),
    );
  } catch {
    // Storage may be unavailable or full; recent scenes are non-essential.
  }
}
