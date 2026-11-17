export interface StreamCropConfig {
  cropZoom: number;
  cropX: number;
  cropY: number;
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
}

export const DEFAULT_YOUTUBE_CROP: StreamCropConfig = {
  cropZoom: 106,
  cropX: 0,
  cropY: 0,
  cropTop: 0,
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0,
};

export const DEFAULT_FULL_CROP: StreamCropConfig = {
  cropZoom: 100,
  cropX: 0,
  cropY: 0,
  cropTop: 0,
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0,
};

export function clampCropValue(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeStreamCrop(
  source?: Partial<StreamCropConfig> | null,
  isYoutubeDefault = true
): StreamCropConfig {
  const defaultZoom = isYoutubeDefault ? 106 : 100;
  return {
    cropZoom: clampCropValue(source?.cropZoom, 100, 200, defaultZoom),
    cropX: clampCropValue(source?.cropX, -30, 30, 0),
    cropY: clampCropValue(source?.cropY, -30, 30, 0),
    cropTop: clampCropValue(source?.cropTop, 0, 30, 0),
    cropBottom: clampCropValue(source?.cropBottom, 0, 30, 0),
    cropLeft: clampCropValue(source?.cropLeft, 0, 30, 0),
    cropRight: clampCropValue(source?.cropRight, 0, 30, 0),
  };
}

function snapToStep(value: number, step: number, min: number, max: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  return Math.round(clamped / step) * step;
}

const ZOOM_CLASS_MAP: Record<number, string> = {
  100: 'scale-[1.00]',
  105: 'scale-[1.05]',
  106: 'scale-[1.06]',
  110: 'scale-[1.10]',
  115: 'scale-[1.15]',
  120: 'scale-[1.20]',
  125: 'scale-[1.25]',
  130: 'scale-[1.30]',
  135: 'scale-[1.35]',
  140: 'scale-[1.40]',
  145: 'scale-[1.45]',
  150: 'scale-[1.50]',
  155: 'scale-[1.55]',
  160: 'scale-[1.60]',
  165: 'scale-[1.65]',
  170: 'scale-[1.70]',
  175: 'scale-[1.75]',
  180: 'scale-[1.80]',
  185: 'scale-[1.85]',
  190: 'scale-[1.90]',
  195: 'scale-[1.95]',
  200: 'scale-[2.00]',
};

const OFFSET_X_CLASS_MAP: Record<number, string> = {
  [-30]: '-translate-x-[30%]',
  [-28]: '-translate-x-[28%]',
  [-26]: '-translate-x-[26%]',
  [-24]: '-translate-x-[24%]',
  [-22]: '-translate-x-[22%]',
  [-20]: '-translate-x-[20%]',
  [-18]: '-translate-x-[18%]',
  [-16]: '-translate-x-[16%]',
  [-14]: '-translate-x-[14%]',
  [-12]: '-translate-x-[12%]',
  [-10]: '-translate-x-[10%]',
  [-8]: '-translate-x-[8%]',
  [-6]: '-translate-x-[6%]',
  [-4]: '-translate-x-[4%]',
  [-2]: '-translate-x-[2%]',
  0: 'translate-x-0',
  2: 'translate-x-[2%]',
  4: 'translate-x-[4%]',
  6: 'translate-x-[6%]',
  8: 'translate-x-[8%]',
  10: 'translate-x-[10%]',
  12: 'translate-x-[12%]',
  14: 'translate-x-[14%]',
  16: 'translate-x-[16%]',
  18: 'translate-x-[18%]',
  20: 'translate-x-[20%]',
  22: 'translate-x-[22%]',
  24: 'translate-x-[24%]',
  26: 'translate-x-[26%]',
  28: 'translate-x-[28%]',
  30: 'translate-x-[30%]',
};

const OFFSET_Y_CLASS_MAP: Record<number, string> = {
  [-30]: '-translate-y-[30%]',
  [-28]: '-translate-y-[28%]',
  [-26]: '-translate-y-[26%]',
  [-24]: '-translate-y-[24%]',
  [-22]: '-translate-y-[22%]',
  [-20]: '-translate-y-[20%]',
  [-18]: '-translate-y-[18%]',
  [-16]: '-translate-y-[16%]',
  [-14]: '-translate-y-[14%]',
  [-12]: '-translate-y-[12%]',
  [-10]: '-translate-y-[10%]',
  [-8]: '-translate-y-[8%]',
  [-6]: '-translate-y-[6%]',
  [-4]: '-translate-y-[4%]',
  [-2]: '-translate-y-[2%]',
  0: 'translate-y-0',
  2: 'translate-y-[2%]',
  4: 'translate-y-[4%]',
  6: 'translate-y-[6%]',
  8: 'translate-y-[8%]',
  10: 'translate-y-[10%]',
  12: 'translate-y-[12%]',
  14: 'translate-y-[14%]',
  16: 'translate-y-[16%]',
  18: 'translate-y-[18%]',
  20: 'translate-y-[20%]',
  22: 'translate-y-[22%]',
  24: 'translate-y-[24%]',
  26: 'translate-y-[26%]',
  28: 'translate-y-[28%]',
  30: 'translate-y-[30%]',
};

const EDGE_HEIGHT_CLASS_MAP: Record<number, string> = {
  0: 'h-0',
  2: 'h-[2%]',
  4: 'h-[4%]',
  6: 'h-[6%]',
  8: 'h-[8%]',
  10: 'h-[10%]',
  12: 'h-[12%]',
  14: 'h-[14%]',
  16: 'h-[16%]',
  18: 'h-[18%]',
  20: 'h-[20%]',
  22: 'h-[22%]',
  24: 'h-[24%]',
  26: 'h-[26%]',
  28: 'h-[28%]',
  30: 'h-[30%]',
};

const EDGE_WIDTH_CLASS_MAP: Record<number, string> = {
  0: 'w-0',
  2: 'w-[2%]',
  4: 'w-[4%]',
  6: 'w-[6%]',
  8: 'w-[8%]',
  10: 'w-[10%]',
  12: 'w-[12%]',
  14: 'w-[14%]',
  16: 'w-[16%]',
  18: 'w-[18%]',
  20: 'w-[20%]',
  22: 'w-[22%]',
  24: 'w-[24%]',
  26: 'w-[26%]',
  28: 'w-[28%]',
  30: 'w-[30%]',
};

export function getStreamCropClasses(crop: StreamCropConfig) {
  const zoomKey = crop.cropZoom === 106 ? 106 : snapToStep(crop.cropZoom, 5, 100, 200);
  const xKey = snapToStep(crop.cropX, 2, -30, 30);
  const yKey = snapToStep(crop.cropY, 2, -30, 30);
  const topKey = snapToStep(crop.cropTop, 2, 0, 30);
  const bottomKey = snapToStep(crop.cropBottom, 2, 0, 30);
  const leftKey = snapToStep(crop.cropLeft, 2, 0, 30);
  const rightKey = snapToStep(crop.cropRight, 2, 0, 30);

  return {
    transformClass: `${ZOOM_CLASS_MAP[zoomKey] || 'scale-[1.00]'} ${OFFSET_X_CLASS_MAP[xKey] || 'translate-x-0'} ${OFFSET_Y_CLASS_MAP[yKey] || 'translate-y-0'}`,
    topBarClass: EDGE_HEIGHT_CLASS_MAP[topKey] || 'h-0',
    bottomBarClass: EDGE_HEIGHT_CLASS_MAP[bottomKey] || 'h-0',
    leftBarClass: EDGE_WIDTH_CLASS_MAP[leftKey] || 'w-0',
    rightBarClass: EDGE_WIDTH_CLASS_MAP[rightKey] || 'w-0',
  };
}

export const CROP_PRESETS: { label: string; config: StreamCropConfig }[] = [
  {
    label: 'Default Clean (106%)',
    config: DEFAULT_YOUTUBE_CROP,
  },
  {
    label: 'Full Frame (100%)',
    config: DEFAULT_FULL_CROP,
  },
  {
    label: 'Zoom 120% (Hide Corners)',
    config: { cropZoom: 120, cropX: 0, cropY: 0, cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 },
  },
  {
    label: 'Focus Center (135%)',
    config: { cropZoom: 135, cropX: 0, cropY: 0, cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 },
  },
  {
    label: 'Hide Top/Bottom Bars',
    config: { cropZoom: 110, cropX: 0, cropY: 0, cropTop: 8, cropBottom: 8, cropLeft: 0, cropRight: 0 },
  },
];
