import React from 'react';
import { Crop, RotateCcw } from 'lucide-react';
import {
  CROP_PRESETS,
  DEFAULT_YOUTUBE_CROP,
  StreamCropConfig,
} from '../utils/streamCrop.ts';

interface StreamCropControlsProps {
  value: StreamCropConfig;
  onChange: (next: StreamCropConfig) => void;
  onReset?: () => void;
  compact?: boolean;
}

export const StreamCropControls: React.FC<StreamCropControlsProps> = ({
  value,
  onChange,
  onReset,
  compact = false,
}) => {
  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      onChange(DEFAULT_YOUTUBE_CROP);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Crop className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
            Video Crop &amp; Framing
          </span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-white/15 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:border-amber-500/50 cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap gap-1.5">
        {CROP_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.config)}
            className="rounded-lg border border-zinc-300 dark:border-white/10 bg-zinc-100/80 dark:bg-white/[0.04] hover:border-amber-500/60 px-2.5 py-1 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Zoom & Pan */}
      <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-3' : ''} gap-3`}>
        <label className="block space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Zoom Scale</span>
            <span className="font-mono-tabular font-semibold text-amber-600 dark:text-amber-400">
              {value.cropZoom}%
            </span>
          </div>
          <input
            type="range"
            min={100}
            max={200}
            step={5}
            value={value.cropZoom === 106 ? 105 : value.cropZoom}
            onChange={(e) => onChange({ ...value, cropZoom: Number(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </label>

        <label className="block space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Horizontal Shift (X)</span>
            <span className="font-mono-tabular font-semibold text-zinc-900 dark:text-zinc-200">
              {value.cropX > 0 ? `+${value.cropX}%` : `${value.cropX}%`}
            </span>
          </div>
          <input
            type="range"
            min={-30}
            max={30}
            step={2}
            value={value.cropX}
            onChange={(e) => onChange({ ...value, cropX: Number(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </label>

        <label className="block space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Vertical Shift (Y)</span>
            <span className="font-mono-tabular font-semibold text-zinc-900 dark:text-zinc-200">
              {value.cropY > 0 ? `+${value.cropY}%` : `${value.cropY}%`}
            </span>
          </div>
          <input
            type="range"
            min={-30}
            max={30}
            step={2}
            value={value.cropY}
            onChange={(e) => onChange({ ...value, cropY: Number(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </label>
      </div>

      {/* Edge Trim Masks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <label className="block space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Crop Top</span>
            <span className="font-mono-tabular font-semibold text-zinc-900 dark:text-zinc-200">
              {value.cropTop}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={2}
            value={value.cropTop}
            onChange={(e) => onChange({ ...value, cropTop: Number(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </label>

        <label className="block space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Crop Bottom</span>
            <span className="font-mono-tabular font-semibold text-zinc-900 dark:text-zinc-200">
              {value.cropBottom}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={2}
            value={value.cropBottom}
            onChange={(e) => onChange({ ...value, cropBottom: Number(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </label>

        <label className="block space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Crop Left</span>
            <span className="font-mono-tabular font-semibold text-zinc-900 dark:text-zinc-200">
              {value.cropLeft}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={2}
            value={value.cropLeft}
            onChange={(e) => onChange({ ...value, cropLeft: Number(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </label>

        <label className="block space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Crop Right</span>
            <span className="font-mono-tabular font-semibold text-zinc-900 dark:text-zinc-200">
              {value.cropRight}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={2}
            value={value.cropRight}
            onChange={(e) => onChange({ ...value, cropRight: Number(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
