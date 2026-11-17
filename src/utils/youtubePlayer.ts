export interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
  getPlaybackQuality: () => string;
  getPlayerState?: () => number;
  getIframe?: () => HTMLIFrameElement;
  destroy: () => void;
}

export interface YTGlobal {
  Player: new (
    element: HTMLElement | string,
    options: {
      host?: string;
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YTPlayerInstance }) => void;
        onStateChange?: (event: { target: YTPlayerInstance; data: number }) => void;
        onPlaybackQualityChange?: (event: { target: YTPlayerInstance; data: string }) => void;
      };
    }
  ) => YTPlayerInstance;
}

declare global {
  interface Window {
    YT?: YTGlobal;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const STANDBY_MUSIC_YOUTUBE_ID = 'BBt3Yeesd_w';

let ytApiPromise: Promise<YTGlobal> | null = null;

export function loadYouTubeIframeApi(): Promise<YTGlobal> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window unavailable'));
  }
  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve(window.YT);
  }
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<YTGlobal>((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousCallback) previousCallback();
      if (window.YT) resolve(window.YT);
    };

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return ytApiPromise;
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (
      !host.includes('youtube.com') &&
      !host.includes('youtu.be') &&
      !host.includes('youtube-nocookie.com')
    ) {
      return null;
    }
    if (host.includes('youtu.be')) {
      const id = parsed.pathname.replace(/^\/+/, '').split('/')[0];
      return id || null;
    }
    const v = parsed.searchParams.get('v');
    if (v) return v;
    if (parsed.pathname.includes('/embed/')) {
      return parsed.pathname.split('/embed/')[1]?.split('/')[0] || null;
    }
    if (parsed.pathname.includes('/live/')) {
      const id = parsed.pathname.split('/live/')[1]?.split('/')[0];
      return id || null;
    }
    return null;
  } catch {
    return null;
  }
}

export function isFramingRestrictedUrl(url: string): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes('iwanttfc.com');
  } catch {
    return false;
  }
}

