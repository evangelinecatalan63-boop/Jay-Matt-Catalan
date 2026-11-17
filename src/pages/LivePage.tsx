import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  Calendar,
  Columns2,
  Crop,
  LayoutGrid,
  Maximize2,
  MessageSquare,
  Minimize2,
  Music,
  Pause,
  Play,
  Radio,
  Send,
  Settings,
  ShieldCheck,
  Square,
  Trash2,
  Tv,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { MultiCamTile } from '../components/MultiCamTile.tsx';
import { StreamCropControls } from '../components/StreamCropControls.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import {
  DEFAULT_FULL_CROP,
  DEFAULT_YOUTUBE_CROP,
  getStreamCropClasses,
  normalizeStreamCrop,
  StreamCropConfig,
} from '../utils/streamCrop.ts';
import {
  extractYouTubeId,
  isFramingRestrictedUrl,
  loadYouTubeIframeApi,
  STANDBY_MUSIC_YOUTUBE_ID,
  YTPlayerInstance,
} from '../utils/youtubePlayer.ts';

const QUALITY_LABELS: Record<string, string> = {
  auto: 'Auto HD',
  default: 'Auto HD',
  highres: '1440p / 4K',
  hd1080: '1080p HD',
  hd720: '720p HD',
  large: '480p',
  medium: '360p',
  small: '240p',
  tiny: '144p',
};

function formatChatTime(createdAt: unknown): string {
  if (!createdAt) return 'Now';
  try {
    const date =
      typeof (createdAt as { toDate?: () => Date }).toDate === 'function'
        ? (createdAt as { toDate: () => Date }).toDate()
        : new Date(createdAt as string | number);
    if (Number.isNaN(date.getTime())) return 'Now';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Now';
  }
}

export const LivePage: React.FC = () => {
  const { user, isAdmin, openAuthModal, resendVerificationEmail } = useAuth();
  const {
    livestreams,
    schedule,
    siteSettings,
    liveChatMessages,
    sendLiveChatMessage,
    deleteLiveChatMessage,
    saveLivestream,
  } = useData();

  const [selectedId, setSelectedId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'single' | 'dual' | 'quad'>('single');
  const [multiSlotIds, setMultiSlotIds] = useState<string[]>([]);
  const [multiAudioSlot, setMultiAudioSlot] = useState<number | null>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [streamReady, setStreamReady] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Adaptive quality readout
  const [actualQuality, setActualQuality] = useState<string>('auto');
  const [qualityMenuOpen, setQualityMenuOpen] = useState<boolean>(false);

  // Admin live crop editor state
  const [cropPanelOpen, setCropPanelOpen] = useState<boolean>(false);
  const [cropDraft, setCropDraft] = useState<StreamCropConfig>(DEFAULT_YOUTUBE_CROP);
  const [cropSaving, setCropSaving] = useState<boolean>(false);
  const [cropNotice, setCropNotice] = useState<string>('');

  // Live chat controls
  const [chatInput, setChatInput] = useState<string>('');
  const [chatSending, setChatSending] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string>('');
  const [verifyNotice, setVerifyNotice] = useState<string>('');
  const lastSentAtRef = useRef<number>(0);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const multiContainerRef = useRef<HTMLDivElement | null>(null);
  const ytMountRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const standbyMountRef = useRef<HTMLDivElement | null>(null);
  const standbyPlayerRef = useRef<YTPlayerInstance | null>(null);
  const hideControlsTimeoutRef = useRef<number | null>(null);
  const readyTimeoutRef = useRef<number | null>(null);
  const isMutedRef = useRef<boolean>(true);

  const [standbyMuted, setStandbyMuted] = useState<boolean>(false);
  const [standbyPlaying, setStandbyPlaying] = useState<boolean>(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const activeFeed = useMemo(() => {
    if (selectedId) {
      const found = livestreams.find((l) => l.id === selectedId);
      if (found) return found;
    }
    return livestreams.find((l) => l.isPrimary) || livestreams[0];
  }, [livestreams, selectedId]);

  const primaryLiveFeed = useMemo(
    () => livestreams.find((l) => l.status === 'live' && Boolean(l.streamUrl)),
    [livestreams]
  );

  const framingBlocked = activeFeed ? isFramingRestrictedUrl(activeFeed.streamUrl) : false;

  const isPlayableLive =
    Boolean(activeFeed) &&
    activeFeed?.status === 'live' &&
    Boolean(activeFeed?.streamUrl) &&
    !framingBlocked &&
    (activeFeed?.providerType === 'youtube' ||
      activeFeed?.providerType === 'iframe' ||
      activeFeed?.providerType === 'external');

  const ytVideoId = useMemo(
    () => (activeFeed ? extractYouTubeId(activeFeed.streamUrl) : null),
    [activeFeed]
  );

  const isYouTube = Boolean(ytVideoId) || activeFeed?.providerType === 'youtube';

  const savedCrop = useMemo(
    () => normalizeStreamCrop(activeFeed, isYouTube),
    [activeFeed, isYouTube]
  );

  useEffect(() => {
    if (!cropPanelOpen) {
      setCropDraft(savedCrop);
    }
  }, [savedCrop, cropPanelOpen]);

  useEffect(() => {
    setCropPanelOpen(false);
    setCropNotice('');
  }, [activeFeed?.id]);

  const effectiveCrop = isAdmin && cropPanelOpen ? cropDraft : savedCrop;
  const cropClasses = useMemo(() => getStreamCropClasses(effectiveCrop), [effectiveCrop]);

  const resolvedMultiFeeds = useMemo(() => {
    const count = viewMode === 'quad' ? 4 : 2;
    return Array.from({ length: count }, (_, idx) => {
      const slotId = multiSlotIds[idx];
      if (slotId) {
        const match = livestreams.find((l) => l.id === slotId);
        if (match) return match;
      }
      return livestreams[idx] || livestreams[0];
    });
  }, [viewMode, multiSlotIds, livestreams]);

  const hasAnyLiveInMultiView = useMemo(
    () =>
      resolvedMultiFeeds.some(
        (feed) =>
          feed &&
          feed.status === 'live' &&
          Boolean(feed.streamUrl) &&
          !isFramingRestrictedUrl(feed.streamUrl)
      ),
    [resolvedMultiFeeds]
  );

  const syncQualityFromPlayer = useCallback((player: YTPlayerInstance) => {
    try {
      const current = player.getPlaybackQuality();
      if (current) {
        setActualQuality(current);
      }
    } catch {
      // Ignore quality query errors before stream initializes
    }
  }, []);

  // Initialize official YouTube IFrame Player API with minimal chrome, muted autoplay, and clean overlay handling
  useEffect(() => {
    if (viewMode !== 'single' || !isPlayableLive || !isYouTube || !ytVideoId) {
      setStreamReady(true);
      return;
    }

    let cancelled = false;
    setIsPlaying(true);
    setIsBuffering(false);
    setIsMuted(true);
    setStreamReady(false);
    setControlsVisible(true);
    setQualityMenuOpen(false);
    setActualQuality('auto');

    if (readyTimeoutRef.current) {
      window.clearTimeout(readyTimeoutRef.current);
    }
    // Safety fallback so loading curtain always clears
    readyTimeoutRef.current = window.setTimeout(() => {
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
                  iframe.title = 'PINOY BIG BROTHER 3.0 Live Video';
                  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
                }
                player.mute();
                player.playVideo();
                syncQualityFromPlayer(player);
              } catch {
                // Ignore player init quirks
              }
              if (readyTimeoutRef.current) {
                window.clearTimeout(readyTimeoutRef.current);
              }
              readyTimeoutRef.current = window.setTimeout(() => {
                if (!cancelled) {
                  setStreamReady(true);
                }
              }, 3400);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              if (event.data === 1) {
                setIsPlaying(true);
                setIsBuffering(false);
                try {
                  if (isMutedRef.current) {
                    event.target.mute();
                  } else {
                    event.target.unMute();
                    event.target.setVolume(100);
                  }
                } catch {
                  // Ignore
                }
                syncQualityFromPlayer(event.target);
                if (readyTimeoutRef.current) {
                  window.clearTimeout(readyTimeoutRef.current);
                }
                readyTimeoutRef.current = window.setTimeout(() => {
                  if (!cancelled) {
                    setStreamReady(true);
                  }
                }, 3000);
              } else if (event.data === 2) {
                setIsPlaying(false);
                setIsBuffering(false);
              } else if (event.data === 3) {
                setIsBuffering(true);
              }
            },
            onPlaybackQualityChange: (event) => {
              if (cancelled) return;
              if (event.data) {
                setActualQuality(event.data);
              }
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          setStreamReady(true);
        }
      });

    return () => {
      cancelled = true;
      if (readyTimeoutRef.current) {
        window.clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // Ignore destroy errors
        }
        ytPlayerRef.current = null;
      }
    };
  }, [viewMode, isPlayableLive, isYouTube, ytVideoId, syncQualityFromPlayer]);

  const isStandbyUnavailable =
    viewMode === 'single'
      ? Boolean(activeFeed) && !isPlayableLive && !(framingBlocked && activeFeed?.status === 'live')
      : !hasAnyLiveInMultiView;

  // Auto-play standby music (hidden audio player) when switching to unavailable/offline/scheduled camera feeds
  useEffect(() => {
    if (!isStandbyUnavailable) {
      setStandbyPlaying(false);
      return;
    }

    let cancelled = false;
    let checkTimer: number | null = null;
    setStandbyMuted(false);
    setStandbyPlaying(false);

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !standbyMountRef.current) return;

        standbyPlayerRef.current = new YT.Player(standbyMountRef.current, {
          host: 'https://www.youtube-nocookie.com',
          videoId: STANDBY_MUSIC_YOUTUBE_ID,
          playerVars: {
            autoplay: 1,
            controls: 0,
            loop: 1,
            playlist: STANDBY_MUSIC_YOUTUBE_ID,
            modestbranding: 1,
            rel: 0,
            disablekb: 1,
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
                  iframe.title = 'PINOY BIG BROTHER 3.0 Standby Audio';
                  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
                }
                player.unMute();
                player.setVolume(75);
                player.playVideo();
              } catch {
                // Ignore
              }

              // Fallback to muted autoplay if browser blocked unmuted audio before user gesture
              checkTimer = window.setTimeout(() => {
                if (cancelled) return;
                try {
                  const state = player.getPlayerState?.();
                  if (state !== 1) {
                    player.mute();
                    player.playVideo();
                    setStandbyMuted(true);
                  } else {
                    setStandbyMuted(false);
                    setStandbyPlaying(true);
                  }
                } catch {
                  // Ignore
                }
              }, 600);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              if (event.data === 0) {
                // Loop track cleanly on end
                try {
                  event.target.playVideo();
                } catch {
                  // Ignore
                }
              } else if (event.data === 1) {
                setStandbyPlaying(true);
              } else if (event.data === 2) {
                setStandbyPlaying(false);
              }
            },
          },
        });
      })
      .catch(() => {
        // Ignore standby audio init errors
      });

    return () => {
      cancelled = true;
      if (checkTimer) {
        window.clearTimeout(checkTimer);
      }
      if (standbyPlayerRef.current) {
        try {
          standbyPlayerRef.current.destroy();
        } catch {
          // Ignore destroy errors
        }
        standbyPlayerRef.current = null;
      }
    };
  }, [isStandbyUnavailable]);

  const handleToggleStandbyMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const player = standbyPlayerRef.current;
    if (!player) return;
    try {
      if (standbyMuted || !standbyPlaying) {
        player.unMute();
        player.setVolume(75);
        player.playVideo();
        setStandbyMuted(false);
        setStandbyPlaying(true);
      } else {
        player.mute();
        setStandbyMuted(true);
      }
    } catch {
      // Ignore
    }
  };

  // Close resolution popover when clicking outside
  useEffect(() => {
    if (!qualityMenuOpen) return;
    const handleOutside = () => setQualityMenuOpen(false);
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, [qualityMenuOpen]);

  // Track fullscreen changes cleanly
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Auto-scroll live chat to bottom when messages arrive
  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [liveChatMessages.length]);

  const revealControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimeoutRef.current) {
      window.clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        window.clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

  const handleTogglePlay = () => {
    revealControlsTemporarily();
    setQualityMenuOpen(false);
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

  const handleToggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    revealControlsTemporarily();
    const player = ytPlayerRef.current;
    if (!isYouTube || !player) return;
    try {
      if (isMuted) {
        player.unMute();
        player.setVolume(100);
        player.playVideo();
        setIsMuted(false);
        setIsPlaying(true);
      } else {
        player.mute();
        setIsMuted(true);
      }
    } catch {
      // Ignore
    }
  };

  const handleToggleFullscreen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    revealControlsTemporarily();
    setQualityMenuOpen(false);
    const el = viewMode === 'single' ? playerContainerRef.current : multiContainerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // Ignore fullscreen denial
    }
  };

  const handleSelectViewMode = (mode: 'single' | 'dual' | 'quad') => {
    setViewMode(mode);
    setQualityMenuOpen(false);
    if (mode !== 'single') {
      setCropPanelOpen(false);
      setMultiSlotIds((prev) => {
        const next: string[] = [];
        const total = mode === 'quad' ? 4 : 2;
        for (let i = 0; i < total; i++) {
          next[i] = prev[i] || livestreams[i]?.id || livestreams[0]?.id || '';
        }
        return next;
      });
    }
  };

  const handleSaveCrop = async () => {
    if (!activeFeed || !isAdmin) return;
    setCropSaving(true);
    setCropNotice('');
    try {
      await saveLivestream({
        ...activeFeed,
        ...cropDraft,
      });
      setCropPanelOpen(false);
      setCropNotice('Live video framing updated for all viewers.');
      window.setTimeout(() => setCropNotice(''), 4000);
    } catch (err) {
      setCropNotice(err instanceof Error ? err.message : 'Unable to save video crop.');
    } finally {
      setCropSaving(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setChatError('');
    if (!user) {
      openAuthModal('signin');
      return;
    }
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const now = Date.now();
    if (now - lastSentAtRef.current < 2000) {
      setChatError('Please wait 2 seconds between messages.');
      return;
    }

    setChatSending(true);
    try {
      await sendLiveChatMessage(activeFeed?.id || 'cam-main-broadcast', trimmed);
      lastSentAtRef.current = now;
      setChatInput('');
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setChatSending(false);
    }
  };

  const statusMeta = (status?: string) => {
    switch (status) {
      case 'live':
        return framingBlocked
          ? { label: 'EMBED RESTRICTED', textClass: 'text-amber-500' }
          : { label: 'LIVE NOW', textClass: 'text-red-500' };
      case 'scheduled':
        return { label: 'SCHEDULED', textClass: 'text-amber-500' };
      case 'offline':
        return { label: 'OFFLINE', textClass: 'text-zinc-400' };
      default:
        return { label: 'NOT AVAILABLE', textClass: 'text-amber-500' };
    }
  };

  const currentMeta = statusMeta(activeFeed?.status);
  const currentQualityLabel =
    actualQuality && actualQuality !== 'auto' && actualQuality !== 'default'
      ? `Auto · ${QUALITY_LABELS[actualQuality] || actualQuality}`
      : 'Auto HD';

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-blue-200/80 dark:border-sky-400/15 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-500">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span>24/7 Official Broadcast Embed</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-950 dark:text-white">
            LIVE ALL ACCESS
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-sky-100/75 max-w-2xl">
            Watch the 24/7 live house feed cleanly inside PINOY BIG BROTHER 3.0 with custom player controls.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-sky-200/75">
          <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0" />
          <span>Embedded inside PINOY BIG BROTHER 3.0</span>
        </div>
      </div>

      {/* Multi-Camera / TV Switcher */}
      {livestreams.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {livestreams.map((feed) => {
            const selected =
              viewMode === 'single'
                ? activeFeed?.id === feed.id
                : resolvedMultiFeeds.some((f) => f?.id === feed.id);
            return (
              <button
                key={feed.id}
                type="button"
                onClick={() => {
                  setSelectedId(feed.id);
                  if (viewMode !== 'single') {
                    setViewMode('single');
                  }
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selected
                    ? 'bg-[#0E5CD6] dark:bg-amber-400 text-white dark:text-[#040D24] font-bold'
                    : 'border border-blue-200 dark:border-sky-400/15 bg-white dark:bg-[#08173A] text-slate-700 dark:text-sky-100 hover:border-amber-400/60'
                }`}
              >
                <Tv className="h-3.5 w-3.5" />
                <span>{feed.cameraLabel}</span>
                <span className="opacity-75 uppercase text-[11px]">
                  · {feed.status === 'unavailable' ? 'N/A' : feed.status}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Video Player + Live Chat Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 flex flex-col gap-4">
          {viewMode === 'single' ? (
            <div
              ref={playerContainerRef}
              onMouseMove={revealControlsTemporarily}
              onMouseEnter={revealControlsTemporarily}
              onContextMenu={(e) => e.preventDefault()}
              className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-[#050508] select-none"
            >
            {isPlayableLive ? (
              isYouTube && ytVideoId ? (
                <>
                  {/* Vertical overscan clips YouTube's top channel/title bar and bottom watermark completely outside the 16:9 viewport */}
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

                  {/* Admin-controlled edge crop bars */}
                  <div className={`pointer-events-none absolute inset-x-0 top-0 z-[5] bg-[#050508] transition-all duration-200 ${cropClasses.topBarClass}`} />
                  <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-[5] bg-[#050508] transition-all duration-200 ${cropClasses.bottomBarClass}`} />
                  <div className={`pointer-events-none absolute inset-y-0 left-0 z-[5] bg-[#050508] transition-all duration-200 ${cropClasses.leftBarClass}`} />
                  <div className={`pointer-events-none absolute inset-y-0 right-0 z-[5] bg-[#050508] transition-all duration-200 ${cropClasses.rightBarClass}`} />

                  {/* Full click-shield prevents hovering or clicking source links, titles, or channel names */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={isPlaying ? 'Pause live stream' : 'Play live stream'}
                    onClick={handleTogglePlay}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleTogglePlay();
                      }
                    }}
                    className="absolute inset-0 z-10 cursor-pointer"
                  />

                  {/* Subtle top-left broadcast badge */}
                  <div className="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-2 rounded-md bg-black/75 backdrop-blur-md border border-white/10 px-3 py-1.5 text-[11px] font-bold tracking-wider text-white">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span>PINOY BIG BROTHER 3.0 · LIVE</span>
                  </div>

                  {/* Prominent single-click audio prompt while muted */}
                  {streamReady && isPlaying && isMuted && (
                    <button
                      type="button"
                      onClick={handleToggleMute}
                      className="absolute top-3 right-3 z-30 inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 px-3.5 py-2 text-xs font-bold shadow-lg transition-colors cursor-pointer"
                    >
                      <VolumeX className="h-4 w-4" />
                      <span>Tap to Unmute</span>
                    </button>
                  )}

                  {/* Initial connecting / buffering curtain hides YouTube startup overlays until clean playback is active */}
                  {(!streamReady || isBuffering) && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#07070B] p-6 text-center space-y-3">
                      <div className="h-10 w-10 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
                      <p className="font-display text-base sm:text-lg font-bold text-white">
                        {streamReady ? 'Syncing Live Broadcast...' : 'Connecting to Live House Stream...'}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Preparing clean broadcast view inside PINOY BIG BROTHER 3.0
                      </p>
                    </div>
                  )}

                  {/* Paused curtain blocks paused overlays, channel info, and suggested videos */}
                  {streamReady && !isPlaying && (
                    <div
                      onClick={handleTogglePlay}
                      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/88 backdrop-blur-md p-6 text-center space-y-4 cursor-pointer"
                    >
                      <div className="h-16 w-16 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
                        <Play className="h-7 w-7 fill-current ml-0.5" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-display text-lg font-bold text-white">
                          Broadcast Paused
                        </p>
                        <p className="text-xs text-zinc-400">
                          Click anywhere to resume the 24/7 live house feed
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Custom minimal PBB ALL ACCESS bottom control bar with Resolution selector */}
                  <div
                    className={`absolute inset-x-0 bottom-0 z-30 flex items-center justify-between gap-2 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-4 py-3 transition-opacity duration-300 ${
                      controlsVisible || !isPlaying || qualityMenuOpen
                        ? 'opacity-100'
                        : 'opacity-0'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePlay();
                        }}
                        aria-label={isPlaying ? 'Pause stream' : 'Play stream'}
                        className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4 fill-current" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleMute}
                        aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                        className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-white/10 hover:bg-white/20 px-3 text-xs font-semibold text-white transition-colors cursor-pointer"
                      >
                        {isMuted ? (
                          <>
                            <VolumeX className="h-4 w-4 text-amber-400" />
                            <span>Unmute</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-4 w-4 text-amber-400" />
                            <span>Audio On</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono-tabular font-semibold text-zinc-300 mr-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        {activeFeed?.cameraLabel || 'Camera 1'}
                      </span>

                      {/* Adaptive Quality Info Popover */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            revealControlsTemporarily();
                            setQualityMenuOpen((prev) => !prev);
                          }}
                          aria-label="Stream quality info"
                          className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-white/10 hover:bg-white/20 px-3 text-xs font-semibold text-white transition-colors cursor-pointer"
                        >
                          <Settings className="h-3.5 w-3.5 text-amber-400" />
                          <span className="font-mono-tabular">{currentQualityLabel}</span>
                        </button>

                        {qualityMenuOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 bottom-11 w-64 rounded-xl border border-white/15 bg-[#06122E]/95 backdrop-blur-xl p-3 shadow-2xl space-y-2.5 z-40 text-left"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                Stream Quality
                              </p>
                              <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono-tabular text-[10px] font-bold text-amber-300">
                                {currentQualityLabel}
                              </span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-zinc-300">
                              Embedded streams adjust resolution automatically for your connection speed and screen size. Manual resolution locking is restricted by YouTube unless native controls or a direct HLS (.m3u8) stream are used.
                            </p>
                            <button
                              type="button"
                              onClick={handleToggleFullscreen}
                              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-2 text-xs font-bold text-zinc-950 transition-colors cursor-pointer"
                            >
                              {isFullscreen ? (
                                <>
                                  <Minimize2 className="h-3.5 w-3.5" />
                                  <span>Exit Fullscreen</span>
                                </>
                              ) : (
                                <>
                                  <Maximize2 className="h-3.5 w-3.5" />
                                  <span>Maximize for HD (Fullscreen)</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleFullscreen}
                        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                        className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                      >
                        {isFullscreen ? (
                          <Minimize2 className="h-4 w-4" />
                        ) : (
                          <Maximize2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={`h-full w-full origin-center transition-transform duration-200 ${cropClasses.transformClass}`}
                  >
                    <iframe
                      src={activeFeed?.streamUrl}
                      title="PINOY BIG BROTHER 3.0 Live Video"
                      className="h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  </div>
                  <div className={`pointer-events-none absolute inset-x-0 top-0 z-[5] bg-[#050508] transition-all duration-200 ${cropClasses.topBarClass}`} />
                  <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-[5] bg-[#050508] transition-all duration-200 ${cropClasses.bottomBarClass}`} />
                  <div className={`pointer-events-none absolute inset-y-0 left-0 z-[5] bg-[#050508] transition-all duration-200 ${cropClasses.leftBarClass}`} />
                  <div className={`pointer-events-none absolute inset-y-0 right-0 z-[5] bg-[#050508] transition-all duration-200 ${cropClasses.rightBarClass}`} />
                </>
              )
            ) : framingBlocked && activeFeed?.status === 'live' ? (
              <div className="flex h-full w-full flex-col items-center justify-center p-6 sm:p-10 text-center space-y-4 bg-[radial-gradient(circle_at_50%_30%,rgba(212,175,55,0.14),transparent_65%)]">
                <div className="h-14 w-14 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-amber-400" />
                </div>
                <div className="space-y-2 max-w-lg">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    In-Page Embed Blocked by Stream Provider
                  </p>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                    Provider Restricts On-Screen Embedding
                  </h2>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    This configured source blocks embedded playback on external websites. PINOY BIG BROTHER 3.0 keeps viewers inside the hub rather than redirecting them off-site.
                  </p>
                </div>
              </div>
            ) : activeFeed?.coverImageUrl ? (
              /* Cover Photo Showcase + automatic standby background music when feed is unavailable, scheduled, or offline */
              <div className="relative h-full w-full overflow-hidden bg-[#0B0B10]">
                <div
                  className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
                  aria-hidden="true"
                >
                  <div ref={standbyMountRef} className="h-full w-full" />
                </div>
                <img
                  src={activeFeed.coverImageUrl}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover opacity-35 blur-2xl scale-110"
                />
                <img
                  src={activeFeed.coverImageUrl}
                  alt={activeFeed.title}
                  className="relative z-10 h-full w-full object-contain"
                />
                <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/95 via-black/45 to-black/25 flex flex-col justify-between p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 rounded-md bg-black/80 border border-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      <Radio className="h-3.5 w-3.5" />
                      {activeFeed.status === 'scheduled'
                        ? 'SCHEDULED'
                        : activeFeed.status === 'offline'
                          ? 'FEED OFFLINE'
                          : 'CURRENTLY NOT AVAILABLE'}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleToggleStandbyMute}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow-lg transition-colors cursor-pointer ${
                          standbyMuted || !standbyPlaying
                            ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                            : 'bg-black/80 hover:bg-black border border-white/15 text-white'
                        }`}
                      >
                        {standbyMuted || !standbyPlaying ? (
                          <>
                            <VolumeX className="h-3.5 w-3.5" />
                            <span>Play Standby Music</span>
                          </>
                        ) : (
                          <>
                            <Music className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                            <span>Music On · Mute</span>
                          </>
                        )}
                      </button>

                      {primaryLiveFeed && primaryLiveFeed.id !== activeFeed.id && (
                        <button
                          type="button"
                          onClick={() => setSelectedId(primaryLiveFeed.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg transition-colors cursor-pointer"
                        >
                          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                          Watch 24/7 Live Feed
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 max-w-xl">
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                      {activeFeed.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                      {activeFeed.description}
                    </p>
                    {activeFeed.scheduleSummary && (
                      <p className="font-mono-tabular text-[11px] text-amber-300 pt-1">
                        {activeFeed.scheduleSummary}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative flex h-full w-full flex-col items-center justify-center p-8 text-center space-y-4 bg-[radial-gradient(circle_at_50%_30%,rgba(212,175,55,0.12),transparent_65%)]">
                <div
                  className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
                  aria-hidden="true"
                >
                  <div ref={standbyMountRef} className="h-full w-full" />
                </div>
                <div className="h-14 w-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
                  <Radio className="h-6 w-6 text-amber-400" />
                </div>
                <div className="space-y-2 max-w-md">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    {currentMeta.label}
                  </p>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                    {activeFeed?.title || 'Stream Unavailable'}
                  </h2>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {activeFeed?.description ||
                      'Authorized livestream link is currently unavailable or scheduled for later.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleStandbyMute}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-bold text-zinc-950 transition-colors cursor-pointer"
                >
                  {standbyMuted || !standbyPlaying ? (
                    <>
                      <VolumeX className="h-3.5 w-3.5" />
                      <span>Play Standby Music</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>Music On · Mute</span>
                    </>
                  )}
                </button>
              </div>
            )}
            </div>
          ) : (
            <div
              ref={multiContainerRef}
              className="relative rounded-2xl border border-zinc-200 dark:border-white/10 bg-[#07070B] p-3 space-y-3"
            >
              {isStandbyUnavailable && (
                <div
                  className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
                  aria-hidden="true"
                >
                  <div ref={standbyMountRef} className="h-full w-full" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {resolvedMultiFeeds.map((feed, idx) => (
                  <MultiCamTile
                    key={`slot-${idx}`}
                    slotIndex={idx}
                    feed={feed}
                    allFeeds={livestreams}
                    fallbackBannerUrl={siteSettings.heroBannerUrl}
                    isAudioUnmuted={multiAudioSlot === idx}
                    onToggleAudio={() =>
                      setMultiAudioSlot((prev) => (prev === idx ? null : idx))
                    }
                    onChangeFeed={(newFeedId) =>
                      setMultiSlotIds((prev) => {
                        const copy = [...prev];
                        copy[idx] = newFeedId;
                        return copy;
                      })
                    }
                    onExpandSingle={(feedId) => {
                      setSelectedId(feedId);
                      setViewMode('single');
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Down-part Camera View Layout Switcher: Single / Dual View (2 Cams) / Quad View (4 Cams) */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mr-1">
                Camera View:
              </span>
              <button
                type="button"
                onClick={() => handleSelectViewMode('single')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'single'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'border border-zinc-300 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] text-zinc-700 dark:text-zinc-300 hover:border-amber-500/50'
                }`}
              >
                <Square className="h-3.5 w-3.5" />
                <span>Single (1 Cam)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectViewMode('dual')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'dual'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'border border-zinc-300 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] text-zinc-700 dark:text-zinc-300 hover:border-amber-500/50'
                }`}
              >
                <Columns2 className="h-3.5 w-3.5" />
                <span>Dual View (2 Cams)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectViewMode('quad')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'quad'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'border border-zinc-300 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] text-zinc-700 dark:text-zinc-300 hover:border-amber-500/50'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Quad View (4 Cams)</span>
              </button>
            </div>

            {viewMode !== 'single' && (
              <div className="flex items-center gap-2">
                {isStandbyUnavailable && (
                  <button
                    type="button"
                    onClick={handleToggleStandbyMute}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                      standbyMuted || !standbyPlaying
                        ? 'bg-amber-500 text-zinc-950'
                        : 'border border-zinc-300 dark:border-white/15 text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {standbyMuted || !standbyPlaying ? (
                      <>
                        <VolumeX className="h-3.5 w-3.5" />
                        <span>Play Standby Music</span>
                      </>
                    ) : (
                      <>
                        <Music className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                        <span>Music On</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-white/15 px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:border-amber-500/50 transition-colors cursor-pointer"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Grid'}</span>
                </button>
              </div>
            )}
          </div>

          {viewMode === 'single' && activeFeed && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-200/80 dark:border-sky-400/15 bg-white dark:bg-[#08173A] p-5">
              <div className="space-y-1">
                <h3 className="font-display text-lg font-bold text-slate-950 dark:text-white">
                  {activeFeed.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-sky-200/75">
                  {activeFeed.cameraLabel} · {activeFeed.scheduleSummary}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {isAdmin && isPlayableLive && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!cropPanelOpen) {
                        setCropDraft(savedCrop);
                        setCropNotice('');
                      }
                      setCropPanelOpen((prev) => !prev);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      cropPanelOpen
                        ? 'bg-amber-500 text-zinc-950'
                        : 'border border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-sky-300 hover:bg-blue-500/20'
                    }`}
                  >
                    <Crop className="h-3.5 w-3.5" />
                    <span>{cropPanelOpen ? 'Close Crop Editor' : 'Admin: Crop Video'}</span>
                  </button>
                )}
                <span className={`font-mono-tabular text-xs font-bold shrink-0 ${currentMeta.textClass}`}>
                  {currentMeta.label}
                </span>
              </div>
            </div>
          )}

          {cropNotice && (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 px-1">
              {cropNotice}
            </p>
          )}

          {isAdmin && cropPanelOpen && activeFeed && (
            <div className="rounded-2xl border border-blue-500/30 bg-white dark:bg-[#08173A] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-white/10 pb-3">
                <div>
                  <p className="text-xs font-bold text-blue-700 dark:text-sky-400">
                    Admin Live Framing Preview
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Adjust zoom, position, or edge crop bars on the live video above, then save to update all viewers.
                  </p>
                </div>
              </div>

              <StreamCropControls
                value={cropDraft}
                onChange={setCropDraft}
                onReset={() => setCropDraft(isYouTube ? DEFAULT_YOUTUBE_CROP : DEFAULT_FULL_CROP)}
                compact
              />

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setCropDraft(savedCrop);
                    setCropPanelOpen(false);
                  }}
                  className="rounded-lg border border-zinc-300 dark:border-white/15 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={cropSaving}
                  onClick={() => void handleSaveCrop()}
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 px-4 py-2 text-xs font-bold text-zinc-950 transition-colors cursor-pointer"
                >
                  {cropSaving ? 'Saving...' : 'Save Crop for All Users'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Real-Time Live Chat Sidebar */}
        <aside className="lg:col-span-4 flex flex-col rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] overflow-hidden h-[460px] lg:h-auto lg:min-h-[480px] lg:max-h-[580px]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-amber-500" />
              <h2 className="font-display text-base font-bold text-zinc-950 dark:text-white">
                Live Chat
              </h2>
            </div>
            <span className="font-mono-tabular text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              {liveChatMessages.length} msgs
            </span>
          </div>

          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3"
          >
            {liveChatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 py-10 space-y-2">
                <MessageSquare className="h-6 w-6 text-zinc-400" />
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  Welcome to PINOY BIG BROTHER 3.0 Live Chat
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Start the conversation while watching the broadcast.
                </p>
              </div>
            ) : (
              liveChatMessages.map((msg) => {
                const isMsgAdmin = msg.role === 'admin';
                const canDelete = isAdmin || (Boolean(user) && user?.uid === msg.userId);
                return (
                  <div
                    key={msg.id}
                    className={`group rounded-xl px-3 py-2.5 text-xs transition-colors ${
                      isMsgAdmin
                        ? 'bg-blue-500/10 border border-blue-500/30 dark:bg-blue-500/12 dark:border-blue-400/30'
                        : 'hover:bg-zinc-100/70 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span
                          className={`font-semibold truncate max-w-[160px] ${
                            isMsgAdmin
                              ? 'text-blue-700 dark:text-sky-400 font-bold'
                              : 'text-zinc-900 dark:text-amber-300'
                          }`}
                        >
                          {msg.displayName}
                        </span>

                        {isMsgAdmin && (
                          <span className="inline-flex items-center gap-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shrink-0">
                            <BadgeCheck className="h-3 w-3" />
                            <span>ADMIN</span>
                          </span>
                        )}

                        <span className="font-mono-tabular text-[10px] text-zinc-400">
                          {formatChatTime(msg.createdAt)}
                        </span>
                      </div>

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => void deleteLiveChatMessage(msg.id)}
                          aria-label="Delete message"
                          className="opacity-60 hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity shrink-0 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="mt-1 text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-100 break-words">
                      {msg.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Composer */}
          <div className="border-t border-zinc-200 dark:border-white/10 p-3.5 bg-zinc-50 dark:bg-[#050E24] shrink-0">
            {!user ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Sign in to chat while watching live.
                </p>
                <button
                  type="button"
                  onClick={() => openAuthModal('signin')}
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-bold text-zinc-950 whitespace-nowrap cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            ) : !user.emailVerified ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Verify your email address to join Live Chat.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      await resendVerificationEmail();
                      setVerifyNotice('Verification email sent.');
                    }}
                    className="rounded-lg border border-amber-500/40 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-300 hover:bg-amber-500/10 shrink-0 cursor-pointer"
                  >
                    Resend
                  </button>
                </div>
                {verifyNotice && (
                  <p className="text-[11px] text-emerald-500">{verifyNotice}</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSendChat} className="space-y-2">
                {isAdmin && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-sky-400">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    <span>Chatting as Site Admin (Highlighted)</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={300}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Say something about the house..."
                    className="flex-1 min-w-0 rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={chatSending || !chatInput.trim()}
                    aria-label="Send message"
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 transition-colors shrink-0 cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                {chatError && (
                  <p className="text-[11px] text-red-500">{chatError}</p>
                )}
              </form>
            )}
          </div>
        </aside>
      </div>

      {/* Broadcast Schedule & Season Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-zinc-950 dark:text-white">
              Broadcast Schedule
            </h2>
            <Calendar className="h-4 w-4 text-amber-500" />
          </div>

          {schedule.length === 0 ? (
            <p className="py-6 text-sm text-zinc-500">
              No scheduled activities listed right now.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {schedule.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-zinc-200 dark:border-white/10 p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono-tabular font-semibold text-amber-600 dark:text-amber-400">
                      {item.startTime}
                    </span>
                    <span className="capitalize text-zinc-500 dark:text-zinc-400">
                      {item.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {item.description}
                  </p>
                  <p className="text-[11px] text-zinc-500">{item.cameraLabel}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {siteSettings.heroBannerUrl && (
          <div className="lg:col-span-4 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-[#EADBC3]">
            <img
              src={siteSettings.heroBannerUrl}
              alt="PINOY BIG BROTHER 3.0 official season banner"
              referrerPolicy="no-referrer"
              className="aspect-square w-full object-cover object-center"
            />
          </div>
        )}
      </div>
    </div>
  );
};
