declare module "pannellum" {
  export interface HotSpotConfig {
    id?: string;
    pitch: number;
    yaw: number;
    type?: "info" | "scene";
    text?: string;
    cssClass?: string;
    createTooltipFunc?: (
      element: HTMLDivElement,
      args: Record<string, unknown>,
    ) => void;
    createTooltipArgs?: Record<string, unknown>;
    clickHandlerFunc?: (
      event: MouseEvent,
      args: Record<string, unknown>,
    ) => void;
    clickHandlerArgs?: Record<string, unknown>;
  }

  export interface ViewerConfig {
    type: "equirectangular" | "cubemap" | "multires";
    panorama?: string | string[];
    cubeMap?: string[];
    multiRes?: Record<string, unknown>;
    preview?: string;
    autoLoad?: boolean;
    showControls?: boolean;
    keyboardZoom?: boolean;
    mouseZoom?: boolean;
    draggable?: boolean;
    pitch?: number;
    yaw?: number;
    hfov?: number;
    minHfov?: number;
    maxHfov?: number;
    compass?: boolean;
    northOffset?: number;
    hotSpots?: HotSpotConfig[];
    strings?: Record<string, string>;
  }

  export interface MultiSceneViewerConfig {
    default: {
      firstScene: string;
    };
    scenes: Record<string, ViewerConfig>;
  }

  export interface Viewer {
    on(event: string, listener: (...args: unknown[]) => void): Viewer;
    destroy(): void;
    getPitch(): number;
    getYaw(): number;
    getHfov(): number;
    setPitch(value: number, duration?: number): Viewer;
    setYaw(value: number, duration?: number): Viewer;
    setHfov(value: number, duration?: number): Viewer;
    startAutoRotate(speed?: number, pitch?: number): Viewer;
    stopAutoRotate(): Viewer;
    toggleFullscreen(): Viewer;
    startOrientation(): void;
    stopOrientation(): void;
    isOrientationSupported(): boolean;
    isOrientationActive(): boolean;
    isLoaded(): boolean;
    getScene(): string;
    loadScene(
      sceneId: string,
      pitch?: number,
      yaw?: number,
      hfov?: number,
    ): Viewer;
    addScene(sceneId: string, config: ViewerConfig): Viewer;
  }

  export function viewer(
    container: string | HTMLElement,
    config: ViewerConfig | MultiSceneViewerConfig,
  ): Viewer;
}

declare module "pannellum/build/pannellum.css";
