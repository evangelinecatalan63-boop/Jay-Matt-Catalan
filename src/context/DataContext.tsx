import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import {
  INITIAL_ANNOUNCEMENTS,
  INITIAL_FAN_POLLS,
  INITIAL_HOUSEMATES,
  INITIAL_LIVESTREAMS,
  INITIAL_NEWS_ARTICLES,
  INITIAL_RANKING_CATEGORIES,
  INITIAL_SCHEDULE,
  INITIAL_SITE_SETTINGS,
} from '../data/seedData.ts';
import {
  ActivityLog,
  AdminRecord,
  Announcement,
  ContactInquiry,
  FanPoll,
  FanPollVote,
  Housemate,
  LiveChatMessage,
  LivestreamFeed,
  NEWS_CATEGORIES,
  NewsAdminState,
  NewsArticle,
  NewsCategory,
  NewsFetchLog,
  RankingCategory,
  RankingVote,
  ScheduleItem,
  SiteSettings,
  UserProfile,
} from '../types/index.ts';
import { normalizeStreamCrop } from '../utils/streamCrop.ts';
import { useAuth } from './AuthContext.tsx';

function normalizeLegacyCategory(cat: string): NewsCategory {
  if ((NEWS_CATEGORIES as readonly string[]).includes(cat)) {
    return cat as NewsCategory;
  }
  switch (cat) {
    case 'Nominations':
      return 'Nomination Results';
    case 'Weekly Challenges':
      return 'Challenges and Tasks';
    case 'Special Events':
      return 'Special Episodes';
    case 'Announcements':
      return 'Official Announcements';
    default:
      return 'Latest News';
  }
}

function normalizeUrlKey(rawUrl: string | undefined): string {
  if (!rawUrl) return '';
  try {
    const u = new URL(rawUrl.trim());
    u.hash = '';
    return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, '')}`;
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

interface DataContextValue {
  housemates: Housemate[];
  livestreams: LivestreamFeed[];
  schedule: ScheduleItem[];
  fanPolls: FanPoll[];
  userVotes: Record<string, FanPollVote>;
  rankingCategories: RankingCategory[];
  userRankingVotes: Record<string, RankingVote>;
  newsArticles: NewsArticle[];
  newsLastSuccessfulUpdate: string | null;
  newsAutoEnabled: boolean;
  adminNewsState: NewsAdminState | null;
  announcements: Announcement[];
  liveChatMessages: LiveChatMessage[];
  siteSettings: SiteSettings;
  isPersistedInDb: boolean;
  dataLoading: boolean;
  visitorCount: number;
  allUsers: UserProfile[];
  adminsList: AdminRecord[];
  activityLogs: ActivityLog[];
  inquiries: ContactInquiry[];
  castFanVote: (pollId: string, housemateId: string) => Promise<void>;
  castRankingVote: (categoryId: string, housemateId: string) => Promise<void>;
  saveRankingCategory: (item: Omit<RankingCategory, 'createdAt' | 'updatedAt'>, isNew: boolean) => Promise<void>;
  deleteRankingCategory: (id: string) => Promise<void>;
  sendLiveChatMessage: (feedId: string, message: string) => Promise<void>;
  deleteLiveChatMessage: (messageId: string) => Promise<void>;
  seedFirestoreIfEmpty: (force?: boolean) => Promise<void>;
  saveHousemate: (item: Omit<Housemate, 'createdAt' | 'updatedAt'>, isNew: boolean) => Promise<void>;
  deleteHousemate: (id: string) => Promise<void>;
  savePoll: (item: Omit<FanPoll, 'createdAt' | 'updatedAt'>, isNew: boolean) => Promise<void>;
  deletePoll: (id: string) => Promise<void>;
  saveLivestream: (item: Omit<LivestreamFeed, 'updatedAt'>) => Promise<void>;
  deleteLivestream: (id: string) => Promise<void>;
  saveScheduleItem: (item: Omit<ScheduleItem, 'updatedAt'>) => Promise<void>;
  deleteScheduleItem: (id: string) => Promise<void>;
  saveArticle: (item: Omit<NewsArticle, 'createdAt' | 'updatedAt'>, isNew: boolean) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
  refreshPublicNewsFeed: () => Promise<void>;
  refreshAdminNewsStatus: () => Promise<void>;
  refreshOfficialNewsNow: () => Promise<NewsFetchLog | null>;
  updateNewsAutomationConfig: (updates: { enabled?: boolean; autoPublish?: boolean }) => Promise<void>;
  moderateAutoNewsArticle: (payload: {
    id: string;
    action: 'approve' | 'reject' | 'edit' | 'delete';
    title?: string;
    excerpt?: string;
    category?: NewsCategory;
    featured?: boolean;
  }) => Promise<void>;
  saveAnnouncement: (item: Omit<Announcement, 'createdAt'>, isNew: boolean) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  updateSiteSettings: (updates: Partial<SiteSettings>) => Promise<void>;
  updateUserRole: (uid: string, email: string, role: 'user' | 'admin') => Promise<void>;
  refreshInquiries: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isAdmin, getIdToken } = useAuth();

  const [dbHousemates, setDbHousemates] = useState<Housemate[]>([]);
  const [dbLivestreams, setDbLivestreams] = useState<LivestreamFeed[]>([]);
  const [dbSchedule, setDbSchedule] = useState<ScheduleItem[]>([]);
  const [dbPolls, setDbPolls] = useState<FanPoll[]>([]);
  const [dbRankingCategories, setDbRankingCategories] = useState<RankingCategory[]>([]);
  const [dbLoadedRankingCategories, setDbLoadedRankingCategories] = useState(false);
  const [dbArticles, setDbArticles] = useState<NewsArticle[]>([]);
  const [dbAnnouncements, setDbAnnouncements] = useState<Announcement[]>([]);
  const [liveChatMessages, setLiveChatMessages] = useState<LiveChatMessage[]>([]);
  const [dbSiteSettings, setDbSiteSettings] = useState<SiteSettings | null>(null);
  const [dbLoadedSettings, setDbLoadedSettings] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [userVotes, setUserVotes] = useState<Record<string, FanPollVote>>({});
  const [userRankingVotes, setUserRankingVotes] = useState<Record<string, RankingVote>>({});
  const [samplePollOverrides, setSamplePollOverrides] = useState<Record<string, Record<string, number>>>({});
  const [sampleRankingOverrides, setSampleRankingOverrides] = useState<Record<string, Record<string, number>>>({});
  const [visitorCount, setVisitorCount] = useState<number>(14820);

  // Admin-only collections
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [adminsList, setAdminsList] = useState<AdminRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);

  const [autoNewsArticles, setAutoNewsArticles] = useState<NewsArticle[]>([]);
  const [newsLastSuccessfulUpdate, setNewsLastSuccessfulUpdate] = useState<string | null>(null);
  const [newsAutoEnabled, setNewsAutoEnabled] = useState<boolean>(true);
  const [adminNewsState, setAdminNewsState] = useState<NewsAdminState | null>(null);

  const autoSeedTriggeredRef = useRef(false);

  const refreshPublicNewsFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/news/feed');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.articles)) {
        setAutoNewsArticles(data.articles);
      }
      if ('lastSuccessfulUpdate' in data) {
        setNewsLastSuccessfulUpdate(data.lastSuccessfulUpdate || null);
      }
      if (typeof data?.enabled === 'boolean') {
        setNewsAutoEnabled(data.enabled);
      }
    } catch {
      // Retain existing articles if feed fetch fails
    }
  }, []);

  // Register site visit, fetch sample poll metrics, and subscribe to public automated news feed
  useEffect(() => {
    let sessionId = '';
    try {
      sessionId = sessionStorage.getItem('pbb_session_id') || '';
      if (!sessionId) {
        sessionId = `sess-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
        sessionStorage.setItem('pbb_session_id', sessionId);
      }
    } catch {
      sessionId = `sess-${Date.now().toString(36)}`;
    }

    fetch('/api/metrics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.totalVisitors) setVisitorCount(data.totalVisitors);
      })
      .catch(() => {});

    fetch('/api/metrics/summary')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.samplePollCounts) setSamplePollOverrides(data.samplePollCounts);
        if (data?.sampleRankingCounts) setSampleRankingOverrides(data.sampleRankingCounts);
      })
      .catch(() => {});

    void refreshPublicNewsFeed();
    // Poll server news feed every 5 minutes so homepage updates seamlessly after background 30m cycles
    const pollHandle = window.setInterval(() => {
      void refreshPublicNewsFeed();
    }, 5 * 60 * 1000);
    // Also check shortly after startup so initial startup fetch results appear quickly
    const warmTimer = window.setTimeout(() => {
      void refreshPublicNewsFeed();
    }, 7000);

    return () => {
      window.clearInterval(pollHandle);
      window.clearTimeout(warmTimer);
    };
  }, [refreshPublicNewsFeed]);

  // Subscribe to public Firestore collections
  useEffect(() => {
    const unsubSettings = onSnapshot(
      doc(db, 'site_settings', 'global'),
      (snap) => {
        if (snap.exists()) {
          setDbSiteSettings(snap.data() as SiteSettings);
        } else {
          setDbSiteSettings(null);
        }
        setDbLoadedSettings(true);
        setDataLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, 'site_settings/global', false);
        setDbLoadedSettings(true);
        setDataLoading(false);
      }
    );

    const unsubHousemates = onSnapshot(
      query(collection(db, 'housemates'), orderBy('orderIndex', 'asc')),
      (snap) => {
        setDbHousemates(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Housemate, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'housemates', false)
    );

    const unsubStreams = onSnapshot(
      query(collection(db, 'livestreams'), orderBy('orderIndex', 'asc')),
      (snap) => {
        setDbLivestreams(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LivestreamFeed, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'livestreams', false)
    );

    const unsubSchedule = onSnapshot(
      collection(db, 'stream_schedule'),
      (snap) => {
        setDbSchedule(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ScheduleItem, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'stream_schedule', false)
    );

    const unsubPolls = onSnapshot(
      collection(db, 'fan_polls'),
      (snap) => {
        setDbPolls(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FanPoll, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'fan_polls', false)
    );

    const unsubRankingCats = onSnapshot(
      query(collection(db, 'ranking_categories'), orderBy('orderIndex', 'asc')),
      (snap) => {
        setDbRankingCategories(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RankingCategory, 'id'>) }))
        );
        setDbLoadedRankingCategories(true);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'ranking_categories', false);
        setDbLoadedRankingCategories(true);
      }
    );

    const unsubNews = onSnapshot(
      query(collection(db, 'news_articles'), orderBy('publishedAt', 'desc')),
      (snap) => {
        setDbArticles(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NewsArticle, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'news_articles', false)
    );

    const unsubAnnouncements = onSnapshot(
      collection(db, 'announcements'),
      (snap) => {
        setDbAnnouncements(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Announcement, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'announcements', false)
    );

    const unsubChat = onSnapshot(
      query(collection(db, 'live_chat_messages'), orderBy('createdAt', 'desc'), limit(80)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<LiveChatMessage, 'id'>) }))
          .reverse();
        setLiveChatMessages(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'live_chat_messages', false)
    );

    return () => {
      unsubSettings();
      unsubHousemates();
      unsubStreams();
      unsubSchedule();
      unsubPolls();
      unsubRankingCats();
      unsubNews();
      unsubAnnouncements();
      unsubChat();
    };
  }, []);

  // Subscribe to current user's vote records
  useEffect(() => {
    if (!user) {
      setUserVotes({});
      setUserRankingVotes({});
      return;
    }

    const q = query(collection(db, 'fan_poll_votes'), where('userId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: Record<string, FanPollVote> = {};
        snap.docs.forEach((d) => {
          const data = d.data() as Omit<FanPollVote, 'id'>;
          next[data.pollId] = { id: d.id, ...data };
        });
        setUserVotes((prev) => ({ ...prev, ...next }));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'fan_poll_votes', false)
    );

    const rq = query(collection(db, 'ranking_votes'), where('userId', '==', user.uid));
    const unsubRanking = onSnapshot(
      rq,
      (snap) => {
        const next: Record<string, RankingVote> = {};
        snap.docs.forEach((d) => {
          const data = d.data() as Omit<RankingVote, 'id'>;
          next[data.categoryId] = { id: d.id, ...data };
        });
        setUserRankingVotes((prev) => ({ ...prev, ...next }));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'ranking_votes', false)
    );

    return () => {
      unsub();
      unsubRanking();
    };
  }, [user]);

  const refreshInquiries = useCallback(async () => {
    if (!isAdmin || !user) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/admin/inquiries', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-pbb-admin-verified': user.uid,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setInquiries(data.inquiries || []);
      }
    } catch {
      // Ignore network error
    }
  }, [isAdmin, user, getIdToken]);

  const refreshAdminNewsStatus = useCallback(async () => {
    if (!isAdmin || !user) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/admin/news/status', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-pbb-admin-verified': user.uid,
        },
      });
      if (res.ok) {
        const data = (await res.json()) as NewsAdminState;
        setAdminNewsState(data);
        setNewsLastSuccessfulUpdate(data.config.lastSuccessfulUpdate);
        setNewsAutoEnabled(data.config.enabled);
      }
    } catch {
      // Ignore network error
    }
  }, [isAdmin, user, getIdToken]);

  // Admin-only listeners
  useEffect(() => {
    if (!isAdmin) {
      setAllUsers([]);
      setAdminsList([]);
      setActivityLogs([]);
      setInquiries([]);
      setAdminNewsState(null);
      return;
    }

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setAllUsers(snap.docs.map((d) => d.data() as UserProfile));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users', false)
    );

    const unsubAdmins = onSnapshot(
      collection(db, 'admins'),
      (snap) => {
        setAdminsList(snap.docs.map((d) => d.data() as AdminRecord));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'admins', false)
    );

    const unsubLogs = onSnapshot(
      query(collection(db, 'activity_logs'), orderBy('createdAt', 'desc')),
      (snap) => {
        setActivityLogs(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ActivityLog, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'activity_logs', false)
    );

    void refreshInquiries();
    void refreshAdminNewsStatus();

    return () => {
      unsubUsers();
      unsubAdmins();
      unsubLogs();
    };
  }, [isAdmin, user, refreshInquiries, refreshAdminNewsStatus]);

  const logActivity = useCallback(
    async (action: string, targetType: string, details: string) => {
      if (!isAdmin || !user) return;
      const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      try {
        await setDoc(doc(db, 'activity_logs', id), {
          action: action.slice(0, 120),
          actorEmail: user.email || 'admin',
          targetType: targetType.slice(0, 60),
          details: details.slice(0, 300),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `activity_logs/${id}`, false);
      }
    },
    [isAdmin, user]
  );

  const seedFirestoreIfEmpty = useCallback(
    async (force = false) => {
      if (!isAdmin || !user) return;
      if (!force && dbSiteSettings?.seeded) return;

      const batch = writeBatch(db);

      INITIAL_HOUSEMATES.forEach((hm) => {
        const { id, ...rest } = hm;
        batch.set(doc(db, 'housemates', id), {
          ...rest,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      INITIAL_LIVESTREAMS.forEach((stream) => {
        const { id, ...rest } = stream;
        batch.set(doc(db, 'livestreams', id), {
          ...rest,
          updatedAt: serverTimestamp(),
        });
      });

      INITIAL_SCHEDULE.forEach((item) => {
        const { id, ...rest } = item;
        batch.set(doc(db, 'stream_schedule', id), {
          ...rest,
          updatedAt: serverTimestamp(),
        });
      });

      INITIAL_FAN_POLLS.forEach((poll) => {
        const { id, ...rest } = poll;
        batch.set(doc(db, 'fan_polls', id), {
          ...rest,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      INITIAL_RANKING_CATEGORIES.forEach((cat) => {
        const { id, ...rest } = cat;
        batch.set(doc(db, 'ranking_categories', id), {
          ...rest,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      INITIAL_NEWS_ARTICLES.forEach((article) => {
        const { id, ...rest } = article;
        batch.set(doc(db, 'news_articles', id), {
          ...rest,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      INITIAL_ANNOUNCEMENTS.forEach((ann) => {
        const { id, ...rest } = ann;
        batch.set(doc(db, 'announcements', id), {
          ...rest,
          createdAt: serverTimestamp(),
        });
      });

      batch.set(doc(db, 'site_settings', 'global'), {
        ...INITIAL_SITE_SETTINGS,
        seeded: true,
        updatedAt: serverTimestamp(),
      });

      const logId = `log-seed-${Date.now()}`;
      batch.set(doc(db, 'activity_logs', logId), {
        action: force ? 'Reset Sample Content' : 'Initialized Platform Seed Data',
        actorEmail: user.email || 'admin',
        targetType: 'system',
        details: 'Synchronized initial housemates, polls, livestreams, and news articles.',
        createdAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'batch-seed');
      }
    },
    [isAdmin, user, dbSiteSettings]
  );

  // Automatically hydrate Firestore once when an admin signs in on a fresh database
  useEffect(() => {
    if (
      isAdmin &&
      dbLoadedSettings &&
      !dbSiteSettings?.seeded &&
      !autoSeedTriggeredRef.current
    ) {
      autoSeedTriggeredRef.current = true;
      void seedFirestoreIfEmpty(false);
    }
  }, [isAdmin, dbLoadedSettings, dbSiteSettings, seedFirestoreIfEmpty]);

  // One-time sync of the primary broadcast link to the clean 24/7 live feed
  useEffect(() => {
    if (!isAdmin || !dbSiteSettings?.seeded || dbLivestreams.length === 0) return;
    const primaryDefault = INITIAL_LIVESTREAMS[0];
    const existingPrimary = dbLivestreams.find((l) => l.id === primaryDefault.id);
    let alreadySynced = false;
    try {
      alreadySynced = localStorage.getItem('pbb_youtube_live_synced_v3') === '1';
    } catch {
      alreadySynced = false;
    }
    if (
      !alreadySynced &&
      existingPrimary &&
      (existingPrimary.providerType === 'none' ||
        existingPrimary.providerType === 'external' ||
        !existingPrimary.streamUrl ||
        existingPrimary.streamUrl.includes('iwanttfc.com'))
    ) {
      try {
        localStorage.setItem('pbb_youtube_live_synced_v3', '1');
      } catch {
        // Ignore storage errors
      }
      void setDoc(doc(db, 'livestreams', primaryDefault.id), {
        title: primaryDefault.title,
        cameraLabel: primaryDefault.cameraLabel,
        streamUrl: primaryDefault.streamUrl,
        providerType: primaryDefault.providerType,
        status: primaryDefault.status,
        isPrimary: primaryDefault.isPrimary,
        scheduleSummary: primaryDefault.scheduleSummary,
        description: primaryDefault.description,
        orderIndex: primaryDefault.orderIndex,
        updatedAt: serverTimestamp(),
      });
    }
  }, [isAdmin, dbSiteSettings, dbLivestreams]);

  // One-time sync of homepage hero banner to the new season banner image
  useEffect(() => {
    if (!isAdmin || !dbSiteSettings?.seeded) return;
    let alreadySynced = false;
    try {
      alreadySynced = localStorage.getItem('pbb_hero_banner_synced_v1') === '1';
    } catch {
      alreadySynced = false;
    }
    if (
      !alreadySynced &&
      (!dbSiteSettings.heroBannerUrl ||
        dbSiteSettings.heroBannerUrl.startsWith('data:image/svg+xml'))
    ) {
      try {
        localStorage.setItem('pbb_hero_banner_synced_v1', '1');
      } catch {
        // Ignore storage errors
      }
      void updateDoc(doc(db, 'site_settings', 'global'), {
        heroBannerUrl: INITIAL_SITE_SETTINGS.heroBannerUrl,
        updatedAt: serverTimestamp(),
      });
    }
  }, [isAdmin, dbSiteSettings]);

  // One-time sync to ensure PBB MAIN LIVE unavailable feed with cover image exists (and restore if previously set to iWantTFC)
  useEffect(() => {
    if (!isAdmin || !dbSiteSettings?.seeded) return;
    const pbbMainDefault = INITIAL_LIVESTREAMS.find((l) => l.id === 'cam-pbb-main-live');
    if (!pbbMainDefault) return;
    const existing = dbLivestreams.find((l) => l.id === pbbMainDefault.id);
    let alreadySynced = false;
    try {
      alreadySynced = localStorage.getItem('pbb_main_live_cam_reverted_v1') === '1';
    } catch {
      alreadySynced = false;
    }
    if (
      (!existing && localStorage.getItem('pbb_main_live_cam_synced_v1') !== '1') ||
      (!alreadySynced && existing?.streamUrl?.includes('iwanttfc.com'))
    ) {
      try {
        localStorage.setItem('pbb_main_live_cam_synced_v1', '1');
        localStorage.setItem('pbb_main_live_cam_reverted_v1', '1');
      } catch {
        // Ignore storage errors
      }
      void setDoc(doc(db, 'livestreams', pbbMainDefault.id), {
        title: pbbMainDefault.title,
        cameraLabel: pbbMainDefault.cameraLabel,
        streamUrl: pbbMainDefault.streamUrl,
        providerType: pbbMainDefault.providerType,
        status: pbbMainDefault.status,
        isPrimary: pbbMainDefault.isPrimary,
        coverImageUrl: pbbMainDefault.coverImageUrl || '',
        scheduleSummary: pbbMainDefault.scheduleSummary,
        description: pbbMainDefault.description,
        orderIndex: pbbMainDefault.orderIndex,
        updatedAt: serverTimestamp(),
      });
    }
  }, [isAdmin, dbSiteSettings, dbLivestreams]);

  // One-time sync to seed ranking categories (Nominate, Save, Support) if missing in DB
  useEffect(() => {
    if (!isAdmin || !dbSiteSettings?.seeded || !dbLoadedRankingCategories) return;
    if (dbRankingCategories.length > 0) return;
    let alreadySynced = false;
    try {
      alreadySynced = localStorage.getItem('pbb_ranking_categories_seeded_v1') === '1';
    } catch {
      alreadySynced = false;
    }
    if (alreadySynced) return;
    try {
      localStorage.setItem('pbb_ranking_categories_seeded_v1', '1');
    } catch {
      // Ignore storage errors
    }
    const batch = writeBatch(db);
    INITIAL_RANKING_CATEGORIES.forEach((cat) => {
      const { id, ...rest } = cat;
      batch.set(doc(db, 'ranking_categories', id), {
        ...rest,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    void batch.commit().catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, 'ranking_categories-seed', false);
    });
  }, [isAdmin, dbSiteSettings, dbLoadedRankingCategories, dbRankingCategories]);

  // One-time sync to migrate Firestore to the complete PBB Collab 3.0 Roster & 2nd Nomination Night (Nov 15, 2026)
  useEffect(() => {
    if (!isAdmin || !user || !dbSiteSettings?.seeded) return;
    let alreadySynced = false;
    try {
      alreadySynced = localStorage.getItem('pbb_collab3_roster_synced_v1') === '1';
    } catch {
      alreadySynced = false;
    }
    if (alreadySynced) return;
    try {
      localStorage.setItem('pbb_collab3_roster_synced_v1', '1');
    } catch {
      // Ignore storage errors
    }

    const batch = writeBatch(db);
    const legacyHousemateIds = [
      'hm-mateo',
      'hm-camille',
      'hm-rafael',
      'hm-althea',
      'hm-julian',
      'hm-sienna',
      'hm-kieran',
      'hm-bianca',
    ];
    legacyHousemateIds.forEach((id) => batch.delete(doc(db, 'housemates', id)));

    INITIAL_HOUSEMATES.forEach((hm) => {
      const { id, ...rest } = hm;
      batch.set(doc(db, 'housemates', id), {
        ...rest,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    const legacyPollIds = ['poll-week-6-favorite', 'poll-week-5-task-mvp'];
    legacyPollIds.forEach((id) => batch.delete(doc(db, 'fan_polls', id)));
    INITIAL_FAN_POLLS.forEach((poll) => {
      const { id, ...rest } = poll;
      batch.set(doc(db, 'fan_polls', id), {
        ...rest,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    INITIAL_RANKING_CATEGORIES.forEach((cat) => {
      const { id, ...rest } = cat;
      batch.set(doc(db, 'ranking_categories', id), {
        ...rest,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    const legacyNewsIds = [
      'news-week6-nominations',
      'news-domino-bridge-challenge',
      'news-guest-mentor-bia',
      'news-week4-eviction-recap',
      'news-midnight-kitchen-acoustic',
      'news-fan-poll-guidelines',
    ];
    legacyNewsIds.forEach((id) => batch.delete(doc(db, 'news_articles', id)));
    INITIAL_NEWS_ARTICLES.forEach((art) => {
      const { id, ...rest } = art;
      batch.set(doc(db, 'news_articles', id), {
        ...rest,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    const legacyAnnIds = ['ann-week6-live', 'ann-stream-schedule'];
    legacyAnnIds.forEach((id) => batch.delete(doc(db, 'announcements', id)));
    INITIAL_ANNOUNCEMENTS.forEach((ann) => {
      const { id, ...rest } = ann;
      batch.set(doc(db, 'announcements', id), {
        ...rest,
        createdAt: serverTimestamp(),
      });
    });

    INITIAL_SCHEDULE.forEach((item) => {
      const { id, ...rest } = item;
      batch.set(doc(db, 'stream_schedule', id), {
        ...rest,
        updatedAt: serverTimestamp(),
      });
    });

    batch.set(doc(db, 'activity_logs', `log-collab3-sync-${Date.now()}`), {
      action: 'Synced PBB Collab 3.0 Roster & 2nd Nomination Results',
      actorEmail: user.email || 'admin',
      targetType: 'system',
      details: 'Updated 20 official Collab 3.0 entrants, Nov 15 nominees, Ligtask immunity, and news schema.',
      createdAt: serverTimestamp(),
    });

    void batch.commit().catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, 'collab3-roster-sync', false);
    });
  }, [isAdmin, user, dbSiteSettings]);

  // One-time sync to update site_settings/global title to PINOY BIG BROTHER 3.0
  useEffect(() => {
    if (!isAdmin || !dbSiteSettings?.seeded) return;
    let alreadySynced = false;
    try {
      alreadySynced = localStorage.getItem('pbb_brand_title_synced_v1') === '1';
    } catch {
      alreadySynced = false;
    }
    if (alreadySynced) return;
    const needsSiteNameUpdate =
      !dbSiteSettings.siteName || dbSiteSettings.siteName === 'PBB ALL ACCESS';
    const needsHeroTitleUpdate =
      !dbSiteSettings.heroWelcomeTitle ||
      dbSiteSettings.heroWelcomeTitle === 'WELCOME TO PBB ALL ACCESS';
    if (!needsSiteNameUpdate && !needsHeroTitleUpdate) return;
    try {
      localStorage.setItem('pbb_brand_title_synced_v1', '1');
    } catch {
      // Ignore storage errors
    }
    void updateDoc(doc(db, 'site_settings', 'global'), {
      ...(needsSiteNameUpdate ? { siteName: 'PINOY BIG BROTHER 3.0' } : {}),
      ...(needsHeroTitleUpdate ? { heroWelcomeTitle: 'WELCOME TO PINOY BIG BROTHER 3.0' } : {}),
      updatedAt: serverTimestamp(),
    }).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, 'site-settings-title-sync', false);
    });
  }, [isAdmin, dbSiteSettings]);

  const isPersistedInDb = Boolean(dbSiteSettings?.seeded);

  const housemates = useMemo(
    () => (isPersistedInDb ? dbHousemates : INITIAL_HOUSEMATES),
    [isPersistedInDb, dbHousemates]
  );

  const livestreams = useMemo(
    () => (isPersistedInDb ? dbLivestreams : INITIAL_LIVESTREAMS),
    [isPersistedInDb, dbLivestreams]
  );

  const schedule = useMemo(
    () => (isPersistedInDb ? dbSchedule : INITIAL_SCHEDULE),
    [isPersistedInDb, dbSchedule]
  );

  const fanPolls = useMemo(() => {
    if (isPersistedInDb) return dbPolls;
    return INITIAL_FAN_POLLS.map((poll) => {
      const override = samplePollOverrides[poll.id];
      if (!override) return poll;
      const total = Object.values(override).reduce((acc, v) => acc + v, 0);
      return { ...poll, optionCounts: override, totalVotes: total };
    });
  }, [isPersistedInDb, dbPolls, samplePollOverrides]);

  const isRankingPersistedInDb = dbRankingCategories.length > 0;

  const rankingCategories = useMemo(() => {
    if (isRankingPersistedInDb) return dbRankingCategories;
    return INITIAL_RANKING_CATEGORIES.map((cat) => {
      const override = sampleRankingOverrides[cat.id];
      if (!override) return cat;
      const total = Object.values(override).reduce((acc, v) => acc + v, 0);
      return { ...cat, counts: override, totalVotes: total };
    });
  }, [isRankingPersistedInDb, dbRankingCategories, sampleRankingOverrides]);

  const newsArticles = useMemo(() => {
    const manualBase: NewsArticle[] = (isPersistedInDb ? dbArticles : INITIAL_NEWS_ARTICLES)
      .filter((a) => (a.approval_status || 'approved') === 'approved')
      .map((a): NewsArticle => ({
        ...a,
        category: normalizeLegacyCategory(a.category),
        featured_image: a.featured_image || a.imageUrl,
        source_name:
          !a.source_name || a.source_name === 'PBB ALL ACCESS'
            ? 'PINOY BIG BROTHER 3.0'
            : a.source_name,
        published_at: a.published_at || a.publishedAt,
      }));

    const seenUrls = new Set(
      manualBase.map((a) => normalizeUrlKey(a.original_article_url)).filter(Boolean)
    );
    const seenIds = new Set(manualBase.map((a) => a.id));

    const merged: NewsArticle[] = [...manualBase];
    for (const autoArt of autoNewsArticles) {
      if ((autoArt.approval_status || 'approved') !== 'approved') continue;
      const urlKey = normalizeUrlKey(autoArt.original_article_url);
      if ((urlKey && seenUrls.has(urlKey)) || seenIds.has(autoArt.id)) continue;
      if (urlKey) seenUrls.add(urlKey);
      seenIds.add(autoArt.id);
      merged.push(autoArt);
    }

    return merged.sort(
      (a, b) =>
        new Date(b.published_at || b.publishedAt).getTime() -
        new Date(a.published_at || a.publishedAt).getTime()
    );
  }, [isPersistedInDb, dbArticles, autoNewsArticles]);

  const announcements = useMemo(
    () => (isPersistedInDb ? dbAnnouncements : INITIAL_ANNOUNCEMENTS),
    [isPersistedInDb, dbAnnouncements]
  );

  const siteSettings = useMemo(() => {
    if (!dbSiteSettings) return INITIAL_SITE_SETTINGS;
    return {
      ...dbSiteSettings,
      siteName:
        !dbSiteSettings.siteName || dbSiteSettings.siteName === 'PBB ALL ACCESS'
          ? 'PINOY BIG BROTHER 3.0'
          : dbSiteSettings.siteName,
      heroWelcomeTitle:
        !dbSiteSettings.heroWelcomeTitle ||
        dbSiteSettings.heroWelcomeTitle === 'WELCOME TO PBB ALL ACCESS'
          ? 'WELCOME TO PINOY BIG BROTHER 3.0'
          : dbSiteSettings.heroWelcomeTitle,
    };
  }, [dbSiteSettings]);

  const castFanVote = useCallback(
    async (pollId: string, housemateId: string) => {
      if (!user) throw new Error('Please sign in to cast your fan poll vote.');
      if (!user.emailVerified) {
        throw new Error('Please verify your email address before voting.');
      }

      const poll = fanPolls.find((p) => p.id === pollId);
      if (!poll) throw new Error('Fan poll not found.');
      if (poll.status !== 'open') throw new Error('This fan poll is currently closed.');

      const token = await getIdToken();
      if (!token) throw new Error('Unable to verify session token.');

      // 1. Server-side validation & anti-spam rate-limit check
      const validateRes = await fetch('/api/vote/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pollId,
          housemateId,
          isPersistedInDb,
        }),
      });

      const validateJson = await validateRes.json();
      if (!validateRes.ok) {
        throw new Error(validateJson.error || 'Vote validation failed.');
      }

      if (!isPersistedInDb && validateJson.mode === 'sample') {
        setSamplePollOverrides((prev) => ({
          ...prev,
          [pollId]: validateJson.updatedCounts,
        }));
        setUserVotes((prev) => ({
          ...prev,
          [pollId]: {
            id: `${pollId}_${user.uid}`,
            pollId,
            userId: user.uid,
            housemateId,
            createdAt: new Date().toISOString(),
          },
        }));
        return;
      }

      // 2. Atomic Firestore writeBatch (vote doc + poll increment)
      const voteDocId = `${pollId}_${user.uid}`;
      const batch = writeBatch(db);
      batch.set(doc(db, 'fan_poll_votes', voteDocId), {
        pollId,
        userId: user.uid,
        housemateId,
        createdAt: serverTimestamp(),
      });

      const updatedCounts = {
        ...poll.optionCounts,
        [housemateId]: (poll.optionCounts[housemateId] || 0) + 1,
      };

      batch.update(doc(db, 'fan_polls', pollId), {
        totalVotes: poll.totalVotes + 1,
        optionCounts: updatedCounts,
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `fan_polls/${pollId}`);
      }
    },
    [user, fanPolls, getIdToken, isPersistedInDb]
  );

  const castRankingVote = useCallback(
    async (categoryId: string, housemateId: string) => {
      if (!user) throw new Error('Please sign in to vote in the rankings.');
      if (!user.emailVerified) {
        throw new Error('Please verify your email address before voting.');
      }

      const category = rankingCategories.find((c) => c.id === categoryId);
      if (!category) throw new Error('Ranking category not found.');
      if (!category.isOpen) throw new Error('Voting for this category is currently closed.');

      const token = await getIdToken();
      if (!token) throw new Error('Unable to verify session token.');

      const validateRes = await fetch('/api/ranking/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          categoryId,
          housemateId,
          isPersistedInDb: isRankingPersistedInDb,
        }),
      });

      const validateJson = await validateRes.json();
      if (!validateRes.ok) {
        throw new Error(validateJson.error || 'Vote validation failed.');
      }

      if (!isRankingPersistedInDb && validateJson.mode === 'sample') {
        setSampleRankingOverrides((prev) => ({
          ...prev,
          [categoryId]: validateJson.updatedCounts,
        }));
        setUserRankingVotes((prev) => ({
          ...prev,
          [categoryId]: {
            id: `${categoryId}_${user.uid}`,
            categoryId,
            userId: user.uid,
            housemateId,
            createdAt: new Date().toISOString(),
          },
        }));
        return;
      }

      const voteDocId = `${categoryId}_${user.uid}`;
      const batch = writeBatch(db);
      batch.set(doc(db, 'ranking_votes', voteDocId), {
        categoryId,
        userId: user.uid,
        housemateId,
        createdAt: serverTimestamp(),
      });

      const updatedCounts = {
        ...category.counts,
        [housemateId]: (category.counts[housemateId] || 0) + 1,
      };

      batch.update(doc(db, 'ranking_categories', categoryId), {
        totalVotes: category.totalVotes + 1,
        counts: updatedCounts,
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `ranking_categories/${categoryId}`);
      }
    },
    [user, rankingCategories, getIdToken, isRankingPersistedInDb]
  );

  const saveRankingCategory = useCallback(
    async (item: Omit<RankingCategory, 'createdAt' | 'updatedAt'>, isNew: boolean) => {
      const { id, ...rest } = item;
      const sanitizedCounts: Record<string, number> = {};
      rest.housemateIds.forEach((hid) => {
        const val = Number(rest.counts?.[hid] ?? 0);
        sanitizedCounts[hid] = Number.isFinite(val) && val >= 0 ? Math.round(val) : 0;
      });
      const totalVotes = Object.values(sanitizedCounts).reduce((a, b) => a + b, 0);

      const payload = {
        title: rest.title.slice(0, 80),
        shortLabel: rest.shortLabel.slice(0, 32),
        subtitle: rest.subtitle.slice(0, 140),
        seasonHeader: rest.seasonHeader.slice(0, 80),
        actionLabel: rest.actionLabel.slice(0, 40),
        valueColumnLabel: rest.valueColumnLabel.slice(0, 32),
        isOpen: Boolean(rest.isOpen),
        housemateIds: rest.housemateIds.slice(0, 30),
        counts: sanitizedCounts,
        totalVotes,
        orderIndex: Math.max(0, Math.min(999, Math.round(Number(rest.orderIndex) || 1))),
      };

      try {
        if (isNew) {
          await setDoc(doc(db, 'ranking_categories', id), {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          await logActivity('Added Ranking Category', 'ranking_category', payload.title);
        } else {
          await updateDoc(doc(db, 'ranking_categories', id), {
            ...payload,
            updatedAt: serverTimestamp(),
          });
          await logActivity('Updated Ranking Category', 'ranking_category', payload.title);
        }
      } catch (err) {
        handleFirestoreError(
          err,
          isNew ? OperationType.CREATE : OperationType.UPDATE,
          `ranking_categories/${id}`
        );
      }
    },
    [logActivity]
  );

  const deleteRankingCategory = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(db, 'ranking_categories', id));
        await logActivity('Deleted Ranking Category', 'ranking_category', id);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `ranking_categories/${id}`);
      }
    },
    [logActivity]
  );

  // Admin CRUD Operations
  const saveHousemate = useCallback(
    async (item: Omit<Housemate, 'createdAt' | 'updatedAt'>, isNew: boolean) => {
      const { id, age, network, isImmune, nominationPoints, ...rest } = item;
      const payload: Record<string, unknown> = {
        ...rest,
        updatedAt: serverTimestamp(),
      };
      if (typeof age === 'number' && !Number.isNaN(age) && age >= 18) {
        payload.age = Math.round(age);
      }
      if (network) {
        payload.network = network;
      }
      if (typeof isImmune === 'boolean') {
        payload.isImmune = isImmune;
      }
      if (typeof nominationPoints === 'number' && !Number.isNaN(nominationPoints) && nominationPoints >= 0) {
        payload.nominationPoints = Math.round(nominationPoints);
      }
      try {
        if (isNew) {
          await setDoc(doc(db, 'housemates', id), {
            ...payload,
            createdAt: serverTimestamp(),
          });
          await logActivity('Added Housemate', 'housemate', item.fullName);
        } else {
          await updateDoc(doc(db, 'housemates', id), payload);
          await logActivity('Updated Housemate', 'housemate', item.fullName);
        }
      } catch (err) {
        handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `housemates/${id}`);
      }
    },
    [logActivity]
  );

  const deleteHousemate = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(db, 'housemates', id));
        await logActivity('Deleted Housemate', 'housemate', id);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `housemates/${id}`);
      }
    },
    [logActivity]
  );

  const savePoll = useCallback(
    async (item: Omit<FanPoll, 'createdAt' | 'updatedAt'>, isNew: boolean) => {
      const { id, ...rest } = item;
      try {
        if (isNew) {
          await setDoc(doc(db, 'fan_polls', id), {
            ...rest,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          await logActivity('Created Fan Poll', 'fan_poll', item.title);
        } else {
          await updateDoc(doc(db, 'fan_polls', id), {
            ...rest,
            updatedAt: serverTimestamp(),
          });
          await logActivity('Updated Fan Poll', 'fan_poll', item.title);
        }
      } catch (err) {
        handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `fan_polls/${id}`);
      }
    },
    [logActivity]
  );

  const deletePoll = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(db, 'fan_polls', id));
        await logActivity('Deleted Fan Poll', 'fan_poll', id);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `fan_polls/${id}`);
      }
    },
    [logActivity]
  );

  const saveLivestream = useCallback(
    async (item: Omit<LivestreamFeed, 'updatedAt'>) => {
      const { id, ...rest } = item;
      const crop = normalizeStreamCrop(rest, rest.providerType === 'youtube');
      try {
        await setDoc(doc(db, 'livestreams', id), {
          title: rest.title,
          cameraLabel: rest.cameraLabel,
          streamUrl: rest.streamUrl,
          providerType: rest.providerType,
          status: rest.status,
          isPrimary: rest.isPrimary,
          coverImageUrl: rest.coverImageUrl || '',
          scheduleSummary: rest.scheduleSummary,
          description: rest.description,
          orderIndex: rest.orderIndex,
          ...crop,
          updatedAt: serverTimestamp(),
        });
        await logActivity('Saved Livestream Feed', 'livestream', `${item.cameraLabel} (${item.status})`);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `livestreams/${id}`);
      }
    },
    [logActivity]
  );

  const sendLiveChatMessage = useCallback(
    async (feedId: string, rawMessage: string) => {
      if (!user) throw new Error('Please sign in to send messages in Live Chat.');
      if (!user.emailVerified) {
        throw new Error('Please verify your email address before chatting.');
      }
      const cleanMessage = rawMessage.trim().slice(0, 300);
      if (!cleanMessage) throw new Error('Please enter a message.');
      const safeFeedId = /^[a-zA-Z0-9_-]{1,128}$/.test(feedId) ? feedId : 'cam-main-broadcast';
      const displayName = (
        profile?.displayName ||
        user.displayName ||
        user.email?.split('@')[0] ||
        'PBB Fan'
      ).slice(0, 80);
      const id = `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      try {
        await setDoc(doc(db, 'live_chat_messages', id), {
          feedId: safeFeedId,
          userId: user.uid,
          displayName,
          role: isAdmin ? 'admin' : 'user',
          message: cleanMessage,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `live_chat_messages/${id}`);
      }
    },
    [user, profile, isAdmin]
  );

  const deleteLiveChatMessage = useCallback(
    async (messageId: string) => {
      try {
        await deleteDoc(doc(db, 'live_chat_messages', messageId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `live_chat_messages/${messageId}`);
      }
    },
    []
  );

  const deleteLivestream = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(db, 'livestreams', id));
        await logActivity('Deleted Livestream Feed', 'livestream', id);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `livestreams/${id}`);
      }
    },
    [logActivity]
  );

  const saveScheduleItem = useCallback(
    async (item: Omit<ScheduleItem, 'updatedAt'>) => {
      const { id, targetDateIso, ...rest } = item;
      const payload: Record<string, unknown> = {
        ...rest,
        updatedAt: serverTimestamp(),
      };
      if (targetDateIso && targetDateIso.trim()) {
        payload.targetDateIso = targetDateIso.trim();
      }
      try {
        await setDoc(doc(db, 'stream_schedule', id), payload);
        await logActivity('Saved Schedule Event', 'stream_schedule', item.title);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stream_schedule/${id}`);
      }
    },
    [logActivity]
  );

  const deleteScheduleItem = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(db, 'stream_schedule', id));
        await logActivity('Deleted Schedule Event', 'stream_schedule', id);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `stream_schedule/${id}`);
      }
    },
    [logActivity]
  );

  const saveArticle = useCallback(
    async (item: Omit<NewsArticle, 'createdAt' | 'updatedAt'>, isNew: boolean) => {
      const { id, ...rest } = item;
      const cleanPayload: Record<string, unknown> = {
        slug: rest.slug,
        title: rest.title,
        excerpt: rest.excerpt,
        content: rest.content,
        category: normalizeLegacyCategory(rest.category),
        imageUrl: rest.imageUrl || rest.featured_image || '',
        featured_image: rest.featured_image || rest.imageUrl || '',
        source_name: rest.source_name || 'PINOY BIG BROTHER 3.0',
        authorName: rest.authorName,
        featured: Boolean(rest.featured),
        publishedAt: rest.publishedAt,
        published_at: rest.published_at || rest.publishedAt,
        approval_status: rest.approval_status || 'approved',
        isAutoCollected: Boolean(rest.isAutoCollected),
        created_at: rest.created_at || new Date().toISOString(),
        updatedAt: serverTimestamp(),
      };
      if (rest.original_article_url) {
        cleanPayload.original_article_url = rest.original_article_url;
      }
      if (rest.fetched_at) {
        cleanPayload.fetched_at = rest.fetched_at;
      }

      try {
        if (isNew) {
          await setDoc(doc(db, 'news_articles', id), {
            ...cleanPayload,
            createdAt: serverTimestamp(),
          });
          await logActivity('Published Article', 'news_article', item.title);
        } else {
          await updateDoc(doc(db, 'news_articles', id), cleanPayload);
          await logActivity('Updated Article', 'news_article', item.title);
        }
      } catch (err) {
        handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `news_articles/${id}`);
      }
    },
    [logActivity]
  );

  const deleteArticle = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(db, 'news_articles', id));
        await logActivity('Deleted Article', 'news_article', id);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `news_articles/${id}`);
      }
    },
    [logActivity]
  );

  const refreshOfficialNewsNow = useCallback(async (): Promise<NewsFetchLog | null> => {
    if (!isAdmin || !user) return null;
    const token = await getIdToken();
    if (!token) throw new Error('Authentication token unavailable.');
    const res = await fetch('/api/admin/news/refresh', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-pbb-admin-verified': user.uid,
      },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to refresh news.');
    }
    if (data.state) {
      setAdminNewsState(data.state);
      setNewsLastSuccessfulUpdate(data.state.config?.lastSuccessfulUpdate || null);
      setNewsAutoEnabled(Boolean(data.state.config?.enabled));
    }
    await refreshPublicNewsFeed();
    await logActivity(
      'Manual Official News Sync',
      'news_automation',
      `Discovered ${data.log?.discoveredCount || 0} PBB Collab 3.0 stories (${data.log?.newArticlesAdded || 0} new)`
    );
    return data.log || null;
  }, [isAdmin, user, getIdToken, refreshPublicNewsFeed, logActivity]);

  const updateNewsAutomationConfig = useCallback(
    async (updates: { enabled?: boolean; autoPublish?: boolean }) => {
      if (!isAdmin || !user) return;
      const token = await getIdToken();
      if (!token) throw new Error('Authentication token unavailable.');
      const res = await fetch('/api/admin/news/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-pbb-admin-verified': user.uid,
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update news automation settings.');
      }
      if (data.config) {
        setNewsAutoEnabled(Boolean(data.config.enabled));
        setAdminNewsState((prev) => (prev ? { ...prev, config: data.config } : prev));
      }
      await refreshPublicNewsFeed();
      await logActivity(
        'Updated News Automation Settings',
        'news_automation',
        `Enabled: ${data.config?.enabled}, Auto-Publish: ${data.config?.autoPublish}`
      );
    },
    [isAdmin, user, getIdToken, refreshPublicNewsFeed, logActivity]
  );

  const moderateAutoNewsArticle = useCallback(
    async (payload: {
      id: string;
      action: 'approve' | 'reject' | 'edit' | 'delete';
      title?: string;
      excerpt?: string;
      category?: NewsCategory;
      featured?: boolean;
    }) => {
      if (!isAdmin || !user) return;
      const token = await getIdToken();
      if (!token) throw new Error('Authentication token unavailable.');
      const res = await fetch('/api/admin/news/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-pbb-admin-verified': user.uid,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update collected article.');
      }
      if (data.state) {
        setAdminNewsState(data.state);
      }
      await refreshPublicNewsFeed();
      await logActivity(`News Moderation (${payload.action})`, 'news_article', payload.id);
    },
    [isAdmin, user, getIdToken, refreshPublicNewsFeed, logActivity]
  );

  const saveAnnouncement = useCallback(
    async (item: Omit<Announcement, 'createdAt'>, isNew: boolean) => {
      const { id, ...rest } = item;
      try {
        if (isNew) {
          await setDoc(doc(db, 'announcements', id), {
            ...rest,
            createdAt: serverTimestamp(),
          });
          await logActivity('Published Announcement', 'announcement', item.title);
        } else {
          await updateDoc(doc(db, 'announcements', id), rest);
          await logActivity('Updated Announcement', 'announcement', item.title);
        }
      } catch (err) {
        handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `announcements/${id}`);
      }
    },
    [logActivity]
  );

  const deleteAnnouncement = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(db, 'announcements', id));
        await logActivity('Deleted Announcement', 'announcement', id);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `announcements/${id}`);
      }
    },
    [logActivity]
  );

  const updateSiteSettings = useCallback(
    async (updates: Partial<SiteSettings>) => {
      const merged: SiteSettings = {
        ...siteSettings,
        ...updates,
        seeded: true,
      };
      try {
        await setDoc(doc(db, 'site_settings', 'global'), {
          ...merged,
          updatedAt: serverTimestamp(),
        });
        await logActivity(
          'Updated Website Settings',
          'site_settings',
          updates.maintenanceMode !== undefined
            ? `Maintenance Mode: ${updates.maintenanceMode ? 'Enabled' : 'Disabled'}`
            : 'Updated global site configuration'
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'site_settings/global');
      }
    },
    [siteSettings, logActivity]
  );

  const updateUserRole = useCallback(
    async (targetUid: string, targetEmail: string, role: 'user' | 'admin') => {
      if (!user) return;
      try {
        await updateDoc(doc(db, 'users', targetUid), {
          role,
          updatedAt: serverTimestamp(),
        });
        if (role === 'admin') {
          await setDoc(doc(db, 'admins', targetUid), {
            uid: targetUid,
            email: targetEmail,
            grantedBy: user.uid,
            createdAt: serverTimestamp(),
          });
        } else {
          await deleteDoc(doc(db, 'admins', targetUid)).catch(() => {});
        }
        await logActivity(`Changed User Role to ${role}`, 'user', targetEmail);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
      }
    },
    [user, logActivity]
  );

  return (
    <DataContext.Provider
      value={{
        housemates,
        livestreams,
        schedule,
        fanPolls,
        userVotes,
        rankingCategories,
        userRankingVotes,
        newsArticles,
        newsLastSuccessfulUpdate,
        newsAutoEnabled,
        adminNewsState,
        announcements,
        liveChatMessages,
        siteSettings,
        isPersistedInDb,
        dataLoading,
        visitorCount,
        allUsers,
        adminsList,
        activityLogs,
        inquiries,
        castFanVote,
        castRankingVote,
        saveRankingCategory,
        deleteRankingCategory,
        sendLiveChatMessage,
        deleteLiveChatMessage,
        seedFirestoreIfEmpty,
        saveHousemate,
        deleteHousemate,
        savePoll,
        deletePoll,
        saveLivestream,
        deleteLivestream,
        saveScheduleItem,
        deleteScheduleItem,
        saveArticle,
        deleteArticle,
        refreshPublicNewsFeed,
        refreshAdminNewsStatus,
        refreshOfficialNewsNow,
        updateNewsAutomationConfig,
        moderateAutoNewsArticle,
        saveAnnouncement,
        deleteAnnouncement,
        updateSiteSettings,
        updateUserRole,
        refreshInquiries,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used inside DataProvider');
  }
  return ctx;
}
