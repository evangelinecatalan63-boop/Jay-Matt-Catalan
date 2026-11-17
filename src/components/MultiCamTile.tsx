import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Pause, Play, Radio, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { LivestreamFeed } from '../types/index.ts';
import { getStreamCropClasses, normalizeStreamCrop } from '../utils/streamCrop.ts';
import {
  extractYouTubeId,
  isFramingRestrictedUrl,
  loadYouTubeIframeApi,
  YTPlayerInstance,
} from '../utils/youtubePlayer.ts';

interface MultiCamTileProps {
  slotIndex: number;
  feed: LivestreamFeed | undefined;
  allFeeds: LivestreamFeed[];
  fallbackBannerUrl: string;
  isAudioUnmuted: boolean;
  onToggleAudio: () => void;
  onChangeFeed: (feedId: string) => void;
  onExpandSingle: (feedId: string) => void;
}

export const MultiCamTile: React.FC<MultiCamTileProps> = ({
  slotIndex,
  feed,
  allFeeds,
  fallbackBannerUrl,
  isAudioUnmuted,
  onToggleAudio,
  onChangeFeed,
  onExpandSingle,
}) => {
  const ytMountRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const readyTimerRef = useRef<number | null>(null);
  const isAudioUnmutedRef = useRef<boolean>(isAudioUnmuted);

  const [streamReady, setStreamReady] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);

  useEffect(() => {
    isAudioUnmutedRef.current = isAudioUnmuted;
    const player = ytPlayerRef.current;
    if (!player) return;
    try {
      if (isAudioUnmuted) {
        player.unMute();
        player.setVolume(100);
      } else {
        player.mute();
      }
    } catch {
      // Ignore sync errors
    }
  }, [isAudioUnmuted]);

  const framingBlocked = feed ? isFramingRestrictedUrl(feed.streamUrl) : false;
  const isPlayableLive =
    Boolean(feed) &&
    feed?.status === 'live' &&
    Boolean(feed?.streamUrl) &&
    !framingBlocked &&
    (feed?.providerType === 'youtube' ||
      feed?.providerType === 'iframe' ||
      feed?.providerType === 'external');

  const ytVideoId = useMemo(
    () => (feed ? extractYouTubeId(feed.streamUrl) : null),
    [feed]
  );
  const isYouTube = Boolean(ytVideoId) || feed?.providerType === 'youtube';

  const cropClasses = useMemo(
    () => getStreamCropClasses(normalizeStreamCrop(feed, isYouTube)),
    [feed, isYouTube]
  );

  useEffect(() => {
    if (!isPlayableLive || !isYouTube || !ytVideoId) {
      setStreamReady(true);
      return;
    }

    let cancelled = false;
    setStreamReady(false);
    setIsPlaying(true);
    setIsBuffering(false);

    if (readyTimerRef.current) {
      window.clearTimeout(readyTimerRef.current);
    }
    readyTimerRef.current = window.setTimeout(() => {
      if (!cancelled) setStreamReady(true);
    }, 6000);

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !ytMountRef.current) return;

        ytPlayerRef.current = new YT.Player(ytMountRef.current, {
          host: 'https://www.youtube-nocookie.com',
          videoId: ytVideoId,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              const player = event.target;
              try {
                const iframe = player.getIframe?.();
                if (iframe) {
                  iframe.tabIndex = -1;
                  iframe.title = `PBB Camera ${slotIndex + 1}`;
                  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
                }
                if (isAudioUnmutedRef.current) {
                  player.unMute();
                  player.setVolume(100);
                } else {
                  player.mute();
                }
                player.playVideo();
              } catch {
                // Ignore
              }
              if (readyTimerRef.current) {
                window.clearTimeout(readyTimerRef.current);
              }
              readyTimerRef.current = window.setTimeout(() => {
                if (!cancelled) setStreamReady(true);
              }, 3400);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              if (event.data === 1) {
                setIsPlaying(true);
                setIsBuffering(false);
                try {
                  if (isAudioUnmutedRef.current) {
                    event.target.unMute();
                    event.target.setVolume(100);
                  } else {
                    event.target.mute();
                  }
                } catch {
                  // Ignore
                }
                if (readyTimerRef.current) {
                  window.clearTimeout(readyTimerRef.current);
                }
                readyTimerRef.current = window.setTimeout(() => {
                  if (!cancelled) setStreamReady(true);
                }, 3000);
              } else if (event.data === 2) {
                setIsPlaying(false);
                setIsBuffering(false);
              } else if (event.data === 3) {
                setIsBuffering(true);
              }
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setStreamReady(true);
      });

    return () => {
      cancelled = true;
      if (readyTimerRef.current) {
        window.clearTimeout(readyTimerRef.current);
        readyTimerRef.current = null;
      }
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // Ignore
        }
        ytPlayerRef.current = null;
      }
    };
  }, [isPlayableLive, isYouTube, ytVideoId, slotIndex]);

  const handleTogglePlay = () => {
    const player = ytPlayerRef.current;
    if (!isYouTube || !player) return;
    try {
      if (isPlaying) {
        player.pauseVideo();
        setIsPlaying(false);
      } else {
        player.playVideo();
        setIsPlaying(true);
      }
    } catch {
      // Ignore
    }
  };

  const coverUrl = feed?.coverImageUrl || fallbackBannerUrl;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-blue-200/80 dark:border-sky-400/20 bg-[#030A1A]">
      {/* Tile Camera Selector Bar */}
      <div className="flex items-center justify-between gap-2 bg-[#06122E] px-3 py-2 border-b border-sky-400/15">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-mono-tabular text-[10px] font-bold uppercase tracking-wider text-amber-400 shrink-0">
            CAM {slotIndex + 1}
          </span>
          {feed?.status === 'live' && !framingBlocked ? (
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-zinc-500 shrink-0" />
          )}
          <select
            aria-label={`Select camera for slot ${slotIndex + 1}`}
            value={feed?.id || ''}
            onChange={(e) => onChangeFeed(e.target.value)}
            className="min-w-0 flex-1 truncate rounded bg-white/5 border border-white/10 px-2 py-1 text-[11px] font-medium text-white focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            {allFeeds.map((cam) => (
              <option key={cam.id} value={cam.id} className="bg-zinc-900 text-white">
                {cam.cameraLabel} ({cam.status === 'unavailable' ? 'N/A' : cam.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isPlayableLive && isYouTube && (
            <>
              <button
                type="button"
                onClick={handleTogglePlay}
                aria-label={isPlaying ? 'Pause camera' : 'Play camera'}
                className="inline-flex items-center justify-center h-7 w-7 rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              </button>
              <button
                type="button"
                onClick={onToggleAudio}
                aria-label={isAudioUnmuted ? 'Mute camera' : 'Listen to camera'}
                className={`inline-flex items-center justify-center h-7 w-7 rounded transition-colors cursor-pointer ${
                  isAudioUnmuted
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {isAudioUnmuted ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              </button>
            </>
          )}
          {feed && (
            <button
              type="button"
              onClick={() => onExpandSingle(feed.id)}
              aria-label={`Open ${feed.cameraLabel} in full single view`}
              className="inline-flex items-center justify-center h-7 w-7 rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 16:9 Tile Frame */}
      <div
        onContextMenu={(e) => e.preventDefault()}
        className="relative aspect-video w-full overflow-hidden bg-[#050508] select-none"
      >
        {isPlayableLive ? (
          isYouTube && ytVideoId ? (
            <>
              {/* Vertical overscan clips YouTube's top channel/title bar and bottom watermark outside the 16:9 tile */}
              <div
                className={`relative h-full w-full overflow-hidden origin-center transition-transform duration-200 ${cropClasses.transformClass}`}
              >
                <div
                  key={ytVideoId}
                  className="absolute inset-x-0 -top-[40%] h-[180%] [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0 [&_iframe]:pointer-events-none"
                >
                  <div ref={ytMountRef} className="h-full w-full" />
                </div>
              </div>

              <div className={`pointer-events-none absolute inset-x-0 top-0 z-[5] bg-[#050508] ${cropClasses.topBarClass}`} />
              <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-[5] bg-[#050508] ${cropClasses.bottomBarClass}`} />
              <div className={`pointer-events-none absolute inset-y-0 left-0 z-[5] bg-[#050508] ${cropClasses.leftBarClass}`} />
              <div className={`pointer-events-none absolute inset-y-0 right-0 z-[5] bg-[#050508] ${cropClasses.rightBarClass}`} />

              {/* Click-shield prevents YouTube channel names or outbound links */}
              <div
                onClick={handleTogglePlay}
                className="absolute inset-0 z-10 cursor-pointer"
              />

              {(!streamReady || isBuffering) && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#07070B] p-4 text-center space-y-2">
                  <div className="h-6 w-6 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
                  <p className="text-[11px] font-semibold text-zinc-300">
                    {streamReady ? `Syncing Cam ${slotIndex + 1}...` : `Connecting Cam ${slotIndex + 1}...`}
                  </p>
                </div>
              )}

              {streamReady && !isPlaying && (
                <div
                  onClick={handleTogglePlay}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-4 text-center space-y-2 cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center">
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  </div>
                  <p className="text-xs font-bold text-white">Paused · Click to Resume</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className={`h-full w-full origin-center ${cropClasses.transformClass}`}>
                <iframe
                  src={feed?.streamUrl}
                  title={feed?.cameraLabel || `Camera ${slotIndex + 1}`}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              </div>
              <div className={`pointer-events-none absolute inset-x-0 top-0 z-[5] bg-[#050508] ${cropClasses.topBarClass}`} />
              <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-[5] bg-[#050508] ${cropClasses.bottomBarClass}`} />
              <div className={`pointer-events-none absolute inset-y-0 left-0 z-[5] bg-[#050508] ${cropClasses.leftBarClass}`} />
              <div className={`pointer-events-none absolute inset-y-0 right-0 z-[5] bg-[#050508] ${cropClasses.rightBarClass}`} />
            </>
          )
        ) : framingBlocked && feed?.status === 'live' ? (
          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center space-y-2 bg-[#0B0B10]">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
            <p className="text-xs font-semibold text-white">Embed Restricted by Provider</p>
          </div>
        ) : coverUrl ? (
          <div className="relative h-full w-full overflow-hidden bg-[#0B0B10]">
            <img
              src={coverUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-30 blur-xl scale-110"
            />
            <img
              src={coverUrl}
              alt={feed?.title || 'Camera Not Available'}
              className="relative z-10 h-full w-full object-contain"
            />
            <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/95 via-black/35 to-black/25 flex flex-col justify-between p-3">
              <span className="self-start inline-flex items-center gap-1.5 rounded bg-black/80 border border-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                <Radio className="h-3 w-3" />
                {feed?.status === 'scheduled'
                  ? 'Scheduled'
                  : feed?.status === 'offline'
                    ? 'Offline'
                    : 'Not Available'}
              </span>
              <p className="text-xs font-bold text-white truncate">
                {feed?.title || 'Feed Unavailable'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center space-y-2">
            <Radio className="h-5 w-5 text-amber-400" />
            <p className="text-xs font-semibold text-zinc-300">
              {feed?.title || 'Camera Not Available'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
