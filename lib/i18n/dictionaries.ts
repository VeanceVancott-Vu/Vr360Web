import type { Language } from "@/lib/types";

export const dictionaries = {
  vi: {
    brand: "Da Nang 360 Explorer",
    eyebrow: "Hành trình thực tế ảo",
    start: "Bắt đầu khám phá",
    explore: "Khám phá",
    scenes: "Điểm đến",
    overview: "Tổng quan",
    search: "Tìm kiếm",
    searchPlaceholder: "Tìm điểm đến…",
    map: "Bản đồ",
    information: "Thông tin",
    share: "Chia sẻ",
    close: "Đóng",
    previous: "Điểm trước",
    next: "Điểm tiếp theo",
    zoomIn: "Phóng to",
    zoomOut: "Thu nhỏ",
    resetView: "Góc nhìn ban đầu",
    autoRotate: "Tự động xoay",
    stopAutoRotate: "Dừng tự động xoay",
    fullscreen: "Toàn màn hình",
    deviceOrientation: "\u0110i\u1ec1u khi\u1ec3n chuy\u1ec3n \u0111\u1ed9ng",
    loadingPanorama: "Đang mở không gian 360°",
    panoramaError: "Không thể tải ảnh toàn cảnh.",
    retry: "Thử lại",
    openMenu: "Mở danh sách điểm đến",
    noAudio: "Điểm đến này chưa có thuyết minh.",
    narration: "Thuyết minh",
    mute: "Tắt tiếng",
    unmute: "Bật tiếng",
    play: "Phát",
    pause: "Tạm dừng",
    restart: "Phát lại",
    currentLocation: "Vị trí hiện tại",
    allLocations: "Tất cả địa điểm",
    floorPlan: "Sơ đồ mặt bằng",
    openFloorPlan: "Mở sơ đồ mặt bằng",
    streetMap: "Bản đồ đường phố",
    details: "Xem chi tiết",
    tourTools: "Công cụ chuyến tham quan",
    skipToScene: "Chuyển đến thông tin điểm hiện tại",
    loadingDestination: "Đang tải điểm đến",
    searchResults: "kết quả",
    developmentAsset: "Ảnh minh họa tổng hợp cho môi trường phát triển",
    welcomeDescription:
      "Đi dọc bờ biển, qua những cây cầu và chạm vào câu chuyện của thành phố trong một hành trình 360° nguyên bản.",
    skipWelcome: "Chuyển đến hành trình",
    recentlyViewed: "Vừa xem",
    copied: "Đã sao chép liên kết",
    externalLink: "Mở liên kết ngoài",
    openImage: "Mở hình ảnh",
    noResults: "Không tìm thấy điểm đến phù hợp.",
    viewerHelp: "Kéo để nhìn xung quanh, cuộn để thu phóng.",
    viewerKeyboardHelp:
      "Dùng các phím mũi tên để nhìn xung quanh, phím cộng và trừ để thu phóng.",
    narrationProgress: "Tiến trình thuyết minh",
    volume: "Âm lượng",
    transcript: "Nội dung thuyết minh",
    audioError: "Không thể phát thuyết minh.",
    webglUnavailable:
      "Trình duyệt không hỗ trợ WebGL. Bạn vẫn có thể dùng danh sách điểm đến.",
    privacy: "Quyền riêng tư",
    analyticsTitle: "Phân tích tùy chọn",
    analyticsSettings: "Cài đặt phân tích",
    analyticsDescription:
      "Nếu bạn đồng ý, chúng tôi chỉ ghi nhận lượt mở chuyến tham quan, điểm đến và tương tác để cải thiện trải nghiệm. Không dùng cookie quảng cáo, không theo dõi trên trang khác và chỉ lưu dữ liệu trong thời gian giới hạn.",
    analyticsAllow: "Cho phép phân tích",
    analyticsDecline: "Không cho phép",
    analyticsStatusAllowed:
      "Phân tích đang được cho phép trên trình duyệt này.",
    analyticsStatusDenied: "Phân tích đang bị tắt trên trình duyệt này.",
    analyticsStatusSignal:
      "Phân tích đã bị tắt vì trình duyệt đang gửi tín hiệu bảo vệ quyền riêng tư.",
    analyticsStatusUnknown: "Bạn chưa chọn tùy chọn phân tích.",
  },
  en: {
    brand: "Da Nang 360 Explorer",
    eyebrow: "A virtual field trip",
    start: "Start exploring",
    explore: "Explore",
    scenes: "Destinations",
    overview: "Overview",
    search: "Search",
    searchPlaceholder: "Find a destination…",
    map: "Map",
    information: "Information",
    share: "Share",
    close: "Close",
    previous: "Previous destination",
    next: "Next destination",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    resetView: "Reset view",
    autoRotate: "Auto rotate",
    stopAutoRotate: "Stop auto rotate",
    fullscreen: "Fullscreen",
    deviceOrientation: "Device motion control",
    loadingPanorama: "Opening the 360° space",
    panoramaError: "The panorama could not be loaded.",
    retry: "Try again",
    openMenu: "Open destination list",
    noAudio: "Narration is not available for this destination.",
    narration: "Narration",
    mute: "Mute",
    unmute: "Unmute",
    play: "Play",
    pause: "Pause",
    restart: "Restart",
    currentLocation: "Current location",
    allLocations: "All locations",
    floorPlan: "Floor plan",
    openFloorPlan: "Open floor plan",
    streetMap: "Street map",
    details: "View details",
    tourTools: "Tour tools",
    skipToScene: "Skip to current destination information",
    loadingDestination: "Loading destination",
    searchResults: "results",
    developmentAsset: "Synthetic illustration for development use",
    welcomeDescription:
      "Trace the coast, cross luminous bridges, and meet the city through an original 360° journey.",
    skipWelcome: "Go to the tour",
    recentlyViewed: "Recently viewed",
    copied: "Link copied",
    externalLink: "Open external link",
    openImage: "Open image",
    noResults: "No matching destinations found.",
    viewerHelp: "Drag to look around and scroll to zoom.",
    viewerKeyboardHelp:
      "Use the arrow keys to look around and the plus and minus keys to zoom.",
    narrationProgress: "Narration progress",
    volume: "Volume",
    transcript: "Transcript",
    audioError: "The narration could not be played.",
    webglUnavailable:
      "WebGL is unavailable. You can still use the destination list.",
    privacy: "Privacy",
    analyticsTitle: "Optional analytics",
    analyticsSettings: "Analytics settings",
    analyticsDescription:
      "If you agree, we record only tour, destination, and interaction events to improve the experience. We use no advertising cookies, do not track you across sites, and retain the data for a limited time.",
    analyticsAllow: "Allow analytics",
    analyticsDecline: "Do not allow",
    analyticsStatusAllowed: "Analytics is allowed in this browser.",
    analyticsStatusDenied: "Analytics is disabled in this browser.",
    analyticsStatusSignal:
      "Analytics is disabled because your browser is sending a privacy signal.",
    analyticsStatusUnknown: "You have not selected an analytics preference.",
  },
} as const;

export type Dictionary = (typeof dictionaries)[Language];

export function getDictionary(language: Language): Dictionary {
  return dictionaries[language] ?? dictionaries.vi;
}

export function parseLanguage(value: string | null | undefined): Language {
  return value === "en" ? "en" : "vi";
}

export function translatedField(
  record: Record<string, string | null | undefined>,
  base: string,
  language: Language,
): string {
  const primary = record[`${base}${language === "vi" ? "Vi" : "En"}`];
  const fallback = record[`${base}${language === "vi" ? "En" : "Vi"}`];
  return primary?.trim() || fallback?.trim() || "";
}
