import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  LayoutDashboard,
  MapPin,
  Plus,
  Radio,
  RefreshCw,
  Settings,
  ShieldAlert,
  Trash2,
  Trophy,
  Upload,
  Users,
  Vote,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import {
  Announcement,
  FanPoll,
  Housemate,
  HousemateNetwork,
  HousemateStatus,
  LivestreamFeed,
  LivestreamProvider,
  LivestreamStatus,
  NEWS_CATEGORIES,
  NewsApprovalStatus,
  NewsArticle,
  NewsCategory,
  PollStatus,
  RankingCategory,
  ScheduleCategory,
  ScheduleItem,
} from '../types/index.ts';
import { StreamCropControls } from '../components/StreamCropControls.tsx';
import {
  DEFAULT_FULL_CROP,
  DEFAULT_YOUTUBE_CROP,
  getStreamCropClasses,
  normalizeStreamCrop,
  StreamCropConfig,
} from '../utils/streamCrop.ts';
import { compressImageFile, createEditorialCoverSvg, createHousematePortraitSvg } from '../utils/studioArt.ts';

function extractPreviewYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes('youtube.com') && !host.includes('youtu.be') && !host.includes('youtube-nocookie.com')) {
      return null;
    }
    if (host.includes('youtu.be')) return parsed.pathname.replace(/^\/+/, '').split('/')[0] || null;
    const v = parsed.searchParams.get('v');
    if (v) return v;
    if (parsed.pathname.includes('/embed/')) return parsed.pathname.split('/embed/')[1]?.split('/')[0] || null;
    if (parsed.pathname.includes('/live/')) return parsed.pathname.split('/live/')[1]?.split('/')[0] || null;
    return null;
  } catch {
    return null;
  }
}

type AdminTab =
  | 'overview'
  | 'rankings'
  | 'housemates'
  | 'voting'
  | 'livestreams'
  | 'content'
  | 'settings';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export const AdminDashboardPage: React.FC = () => {
  const { user, isAdmin, loading, openAuthModal } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    housemates,
    livestreams,
    schedule,
    fanPolls,
    rankingCategories,
    newsArticles,
    adminNewsState,
    announcements,
    siteSettings,
    visitorCount,
    allUsers,
    activityLogs,
    inquiries,
    seedFirestoreIfEmpty,
    saveHousemate,
    deleteHousemate,
    savePoll,
    deletePoll,
    saveRankingCategory,
    deleteRankingCategory,
    saveLivestream,
    deleteLivestream,
    saveScheduleItem,
    deleteScheduleItem,
    saveArticle,
    deleteArticle,
    refreshAdminNewsStatus,
    refreshOfficialNewsNow,
    updateNewsAutomationConfig,
    moderateAutoNewsArticle,
    saveAnnouncement,
    deleteAnnouncement,
    updateSiteSettings,
    updateUserRole,
    refreshInquiries,
  } = useData();

  const initialTabParam = searchParams.get('tab') as AdminTab | null;
  const validTabs: AdminTab[] = ['overview', 'rankings', 'housemates', 'voting', 'livestreams', 'content', 'settings'];
  const [activeTab, setActiveTabState] = useState<AdminTab>(
    initialTabParam && validTabs.includes(initialTabParam) ? initialTabParam : 'overview'
  );

  useEffect(() => {
    const param = searchParams.get('tab') as AdminTab | null;
    if (param && validTabs.includes(param) && param !== activeTab) {
      setActiveTabState(param);
    }
  }, [searchParams]);

  const setActiveTab = (tab: AdminTab) => {
    setActiveTabState(tab);
    setSearchParams({ tab }, { replace: true });
  };

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    label: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Housemate Form State
  const [hmForm, setHmForm] = useState<{
    id: string;
    isNew: boolean;
    fullName: string;
    nickname: string;
    age: string;
    hometown: string;
    tagline: string;
    biography: string;
    status: HousemateStatus;
    network: HousemateNetwork;
    isImmune: boolean;
    nominationPoints: string;
    photoUrl: string;
    featured: boolean;
    enteredDay: number;
    orderIndex: number;
  }>({
    id: '',
    isNew: true,
    fullName: '',
    nickname: '',
    age: '',
    hometown: '',
    tagline: '',
    biography: '',
    status: 'active',
    network: 'Kapamilya',
    isImmune: false,
    nominationPoints: '',
    photoUrl: '',
    featured: false,
    enteredDay: 1,
    orderIndex: 21,
  });

  // Ranking Category Form State
  const [catForm, setCatForm] = useState<{
    id: string;
    isNew: boolean;
    title: string;
    shortLabel: string;
    subtitle: string;
    seasonHeader: string;
    actionLabel: string;
    valueColumnLabel: string;
    isOpen: boolean;
    orderIndex: number;
    housemateIds: string[];
    counts: Record<string, number>;
  }>({
    id: '',
    isNew: true,
    title: '',
    shortLabel: '',
    subtitle: 'COMMUNITY SENTIMENT · LIVE POWER RANKING',
    seasonHeader: 'PBB COLLAB 3.0 HOUSEMATES',
    actionLabel: 'Vote',
    valueColumnLabel: 'VOTES',
    isOpen: true,
    orderIndex: 4,
    housemateIds: [],
    counts: {},
  });

  useEffect(() => {
    if (
      activeTab === 'rankings' &&
      catForm.isNew &&
      catForm.housemateIds.length === 0 &&
      housemates.length > 0
    ) {
      setCatForm((prev) =>
        prev.isNew && prev.housemateIds.length === 0
          ? { ...prev, housemateIds: housemates.map((h) => h.id) }
          : prev
      );
    }
  }, [activeTab, catForm.isNew, catForm.housemateIds.length, housemates]);

  // Quick Ranking Housemate Editor State (Picture, Name, Location)
  const [quickHmForm, setQuickHmForm] = useState<{
    id: string;
    isNew: boolean;
    fullName: string;
    hometown: string;
    photoUrl: string;
    status: HousemateStatus;
  }>({
    id: '',
    isNew: true,
    fullName: '',
    hometown: '',
    photoUrl: '',
    status: 'active',
  });

  // Poll Form State
  const [pollForm, setPollForm] = useState<{
    id: string;
    isNew: boolean;
    title: string;
    description: string;
    instructions: string;
    status: PollStatus;
    startDate: string;
    endDate: string;
    housemateIds: string[];
    isFeatured: boolean;
    totalVotes: number;
    optionCounts: Record<string, number>;
  }>({
    id: '',
    isNew: true,
    title: '',
    description: '',
    instructions:
      'Sign in with a verified account and select one housemate. Unofficial community fan poll.',
    status: 'open',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 16),
    housemateIds: [],
    isFeatured: false,
    totalVotes: 0,
    optionCounts: {},
  });

  // Livestream Form State
  const [streamForm, setStreamForm] = useState<{
    id: string;
    title: string;
    cameraLabel: string;
    streamUrl: string;
    providerType: LivestreamProvider;
    status: LivestreamStatus;
    isPrimary: boolean;
    coverImageUrl: string;
    scheduleSummary: string;
    description: string;
    orderIndex: number;
    cropZoom: number;
    cropX: number;
    cropY: number;
    cropTop: number;
    cropBottom: number;
    cropLeft: number;
    cropRight: number;
  }>({
    id: '',
    title: '',
    cameraLabel: '',
    streamUrl: '',
    providerType: 'none',
    status: 'offline',
    isPrimary: false,
    coverImageUrl: '',
    scheduleSummary: '',
    description: '',
    orderIndex: 1,
    ...DEFAULT_YOUTUBE_CROP,
  });

  // Schedule Form State
  const [schedForm, setSchedForm] = useState<{
    id: string;
    title: string;
    category: ScheduleCategory;
    startTime: string;
    endTime: string;
    targetDateIso: string;
    cameraLabel: string;
    description: string;
    isUpcoming: boolean;
  }>({
    id: '',
    title: '',
    category: 'livestream',
    startTime: '',
    endTime: '',
    targetDateIso: '',
    cameraLabel: 'Camera 1 · Main House',
    description: '',
    isUpcoming: true,
  });

  // Article Form State
  const [articleForm, setArticleForm] = useState<{
    id: string;
    isNew: boolean;
    title: string;
    category: NewsCategory;
    excerpt: string;
    content: string;
    imageUrl: string;
    authorName: string;
    featured: boolean;
    publishedAt: string;
  }>({
    id: '',
    isNew: true,
    title: '',
    category: 'Latest News',
    excerpt: '',
    content: '',
    imageUrl: '',
    authorName: 'PINOY BIG BROTHER 3.0 Editorial',
    featured: false,
    publishedAt: new Date().toISOString().slice(0, 16),
  });

  // Automated News Control Center State
  const [newsRefreshing, setNewsRefreshing] = useState(false);
  const [autoNewsFilter, setAutoNewsFilter] = useState<'all' | NewsApprovalStatus>('all');
  const [editingAutoArticle, setEditingAutoArticle] = useState<{
    id: string;
    title: string;
    excerpt: string;
    category: NewsCategory;
    featured: boolean;
  } | null>(null);

  // Announcement Form State
  const [annForm, setAnnForm] = useState<{
    id: string;
    isNew: boolean;
    title: string;
    message: string;
    priority: 'normal' | 'urgent';
    active: boolean;
    linkUrl: string;
  }>({
    id: '',
    isNew: true,
    title: '',
    message: '',
    priority: 'normal',
    active: true,
    linkUrl: '/news',
  });

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState(siteSettings);

  useEffect(() => {
    setSettingsForm(siteSettings);
  }, [siteSettings]);

  const notify = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 5000);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center text-sm text-zinc-500">
        Verifying administrator session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center space-y-5">
        <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto" />
        <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white">
          Administrator Sign-In Required
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Please sign in with an authorized administrator account to access the PINOY BIG BROTHER 3.0 control center.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('signin')}
          className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-amber-400 transition-colors cursor-pointer"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center space-y-5">
        <ShieldAlert className="h-10 w-10 text-red-500 mx-auto" />
        <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white">
          Restricted Access
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Your account ({user.email}) does not hold verified administrator permissions.
        </p>
        <Link
          to="/"
          className="inline-flex rounded-xl border border-zinc-300 dark:border-white/15 px-5 py-2.5 text-sm font-semibold text-zinc-900 dark:text-white"
        >
          Return Home
        </Link>
      </div>
    );
  }

  const totalFanVotes = fanPolls.reduce((acc, p) => acc + (p.totalVotes || 0), 0);
  const activePollsCount = fanPolls.filter((p) => p.status === 'open').length;

  const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: 'rankings', label: 'Rankings & Categories', icon: <Trophy className="h-4 w-4" /> },
    { key: 'housemates', label: 'Housemates', icon: <Users className="h-4 w-4" /> },
    { key: 'voting', label: 'Fan Polls', icon: <Vote className="h-4 w-4" /> },
    { key: 'livestreams', label: 'Livestreams', icon: <Radio className="h-4 w-4" /> },
    { key: 'content', label: 'News, Content & Hero', icon: <FileText className="h-4 w-4" /> },
    { key: 'settings', label: 'Settings & Users', icon: <Settings className="h-4 w-4" /> },
  ];

  // Handlers
  const handleHmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id =
        hmForm.id ||
        `hm-${slugify(hmForm.nickname || hmForm.fullName)}-${Date.now().toString(36).slice(-4)}`;
      const slug = slugify(hmForm.fullName) || id;
      const fallbackPhoto =
        hmForm.photoUrl ||
        createHousematePortraitSvg({
          initials: (hmForm.fullName.slice(0, 2) || 'HM').toUpperCase(),
          accent: '#D4AF37',
          secondary: '#17171B',
          skinTone: '#D6A682',
          hairStyle: 'short',
          hairColor: '#1B1918',
        });

      const parsedAge = hmForm.age ? Number(hmForm.age) : undefined;
      const parsedNomPts = hmForm.nominationPoints !== '' ? Number(hmForm.nominationPoints) : undefined;
      await saveHousemate(
        {
          id,
          slug,
          fullName: hmForm.fullName.trim(),
          nickname: hmForm.nickname.trim(),
          ...(parsedAge && parsedAge >= 18 ? { age: parsedAge } : {}),
          hometown: hmForm.hometown.trim(),
          tagline: hmForm.tagline.trim(),
          biography: hmForm.biography.trim(),
          status: hmForm.status,
          network: hmForm.network,
          isImmune: hmForm.isImmune,
          ...(typeof parsedNomPts === 'number' && !Number.isNaN(parsedNomPts) && parsedNomPts >= 0
            ? { nominationPoints: parsedNomPts }
            : {}),
          avatarColor: '#D4AF37',
          photoUrl: fallbackPhoto,
          featured: hmForm.featured,
          enteredDay: Number(hmForm.enteredDay) || 1,
          orderIndex: Number(hmForm.orderIndex) || housemates.length + 1,
        },
        hmForm.isNew
      );
      notify('success', hmForm.isNew ? 'Housemate added.' : 'Housemate updated.');
      setHmForm({
        id: '',
        isNew: true,
        fullName: '',
        nickname: '',
        age: '',
        hometown: '',
        tagline: '',
        biography: '',
        status: 'active',
        network: 'Kapamilya',
        isImmune: false,
        nominationPoints: '',
        photoUrl: '',
        featured: false,
        enteredDay: 1,
        orderIndex: housemates.length + 2,
      });
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to save housemate.');
    }
  };

  const handlePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pollForm.housemateIds.length === 0) {
      notify('error', 'Select at least one participating housemate for this fan poll.');
      return;
    }
    try {
      const id = pollForm.id || `poll-${Date.now().toString(36)}`;
      const counts: Record<string, number> = {};
      pollForm.housemateIds.forEach((hid) => {
        counts[hid] = pollForm.optionCounts[hid] || 0;
      });
      const total = Object.values(counts).reduce((a, b) => a + b, 0);

      await savePoll(
        {
          id,
          title: pollForm.title.trim(),
          description: pollForm.description.trim(),
          instructions: pollForm.instructions.trim(),
          status: pollForm.status,
          startDate: new Date(pollForm.startDate).toISOString(),
          endDate: new Date(pollForm.endDate).toISOString(),
          housemateIds: pollForm.housemateIds,
          totalVotes: total,
          optionCounts: counts,
          isFeatured: pollForm.isFeatured,
        },
        pollForm.isNew
      );
      notify('success', pollForm.isNew ? 'Fan poll created.' : 'Fan poll updated.');
      setPollForm({
        id: '',
        isNew: true,
        title: '',
        description: '',
        instructions:
          'Sign in with a verified account and select one housemate. Unofficial community fan poll.',
        status: 'open',
        startDate: new Date().toISOString().slice(0, 16),
        endDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 16),
        housemateIds: [],
        isFeatured: false,
        totalVotes: 0,
        optionCounts: {},
      });
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to save fan poll.');
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedIds =
      catForm.housemateIds.length > 0 ? catForm.housemateIds : housemates.map((h) => h.id);
    if (selectedIds.length === 0) {
      notify('error', 'Please add or select at least one housemate for this category.');
      return;
    }
    try {
      const id =
        catForm.id ||
        `cat-${slugify(catForm.shortLabel || catForm.title) || 'custom'}-${Date.now().toString(36).slice(-4)}`;
      const sanitizedCounts: Record<string, number> = {};
      selectedIds.forEach((hid) => {
        const val = Number(catForm.counts[hid] ?? 0);
        sanitizedCounts[hid] = Number.isFinite(val) && val >= 0 ? Math.round(val) : 0;
      });
      const totalVotes = Object.values(sanitizedCounts).reduce((a, b) => a + b, 0);

      await saveRankingCategory(
        {
          id,
          title: catForm.title.trim(),
          shortLabel: (catForm.shortLabel || catForm.title).trim().toUpperCase(),
          subtitle: catForm.subtitle.trim(),
          seasonHeader: catForm.seasonHeader.trim() || 'PBB COLLAB 3.0 HOUSEMATES',
          actionLabel: catForm.actionLabel.trim() || 'Vote',
          valueColumnLabel: (catForm.valueColumnLabel || 'VOTES').trim().toUpperCase(),
          isOpen: catForm.isOpen,
          housemateIds: selectedIds,
          counts: sanitizedCounts,
          totalVotes,
          orderIndex: Number(catForm.orderIndex) || rankingCategories.length + 1,
        },
        catForm.isNew
      );
      notify(
        'success',
        catForm.isNew ? 'Ranking category added.' : 'Ranking category updated.'
      );
      setCatForm({
        id: '',
        isNew: true,
        title: '',
        shortLabel: '',
        subtitle: 'COMMUNITY SENTIMENT · LIVE POWER RANKING',
        seasonHeader: 'PBB COLLAB 3.0 HOUSEMATES',
        actionLabel: 'Vote',
        valueColumnLabel: 'VOTES',
        isOpen: true,
        orderIndex: rankingCategories.length + 2,
        housemateIds: housemates.map((h) => h.id),
        counts: {},
      });
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to save ranking category.');
    }
  };

  const handleQuickHmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = quickHmForm.fullName.trim();
    const cleanLocation = quickHmForm.hometown.trim();
    if (!cleanName || !cleanLocation) {
      notify('error', 'Please provide both Name and Location.');
      return;
    }
    try {
      const existing = !quickHmForm.isNew
        ? housemates.find((h) => h.id === quickHmForm.id)
        : undefined;
      const id =
        quickHmForm.id ||
        `hm-${slugify(cleanName)}-${Date.now().toString(36).slice(-4)}`;
      const slug = existing?.slug || slugify(cleanName) || id;
      const fallbackPhoto =
        quickHmForm.photoUrl.trim() ||
        existing?.photoUrl ||
        createHousematePortraitSvg({
          initials: cleanName.slice(0, 2).toUpperCase(),
          accent: '#D4AF37',
          secondary: '#17171B',
          skinTone: '#D6A682',
          hairStyle: 'short',
          hairColor: '#1B1918',
        });

      await saveHousemate(
        {
          id,
          slug,
          fullName: cleanName,
          nickname: existing?.nickname || cleanName.split(' ')[0] || cleanName,
          ...(existing?.age ? { age: existing.age } : {}),
          hometown: cleanLocation,
          tagline: existing?.tagline || `Official Housemate from ${cleanLocation}`,
          biography:
            existing?.biography ||
            `${cleanName} represents ${cleanLocation} in the Pinoy Big Brother House.`,
          status: quickHmForm.status,
          avatarColor: existing?.avatarColor || '#D4AF37',
          photoUrl: fallbackPhoto,
          featured: existing?.featured ?? true,
          enteredDay: existing?.enteredDay ?? 1,
          orderIndex: existing?.orderIndex ?? housemates.length + 1,
        },
        quickHmForm.isNew
      );

      // Automatically include newly added housemate in persisted ranking categories so they appear immediately
      if (quickHmForm.isNew && rankingCategories.length > 0) {
        await Promise.all(
          rankingCategories
            .filter((cat) => Boolean(cat.createdAt) && !cat.housemateIds.includes(id))
            .map((cat) =>
              saveRankingCategory(
                {
                  ...cat,
                  housemateIds: [...cat.housemateIds, id],
                  counts: { ...cat.counts, [id]: 0 },
                },
                false
              )
            )
        );
      }

      notify(
        'success',
        quickHmForm.isNew
          ? `${cleanName} added to Housemates & Rankings.`
          : `${cleanName} updated.`
      );
      setQuickHmForm({
        id: '',
        isNew: true,
        fullName: '',
        hometown: '',
        photoUrl: '',
        status: 'active',
      });
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to save housemate.');
    }
  };

  const handleStreamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = streamForm.id || `cam-${Date.now().toString(36)}`;
      await saveLivestream({
        id,
        title: streamForm.title.trim(),
        cameraLabel: streamForm.cameraLabel.trim(),
        streamUrl: streamForm.streamUrl.trim(),
        providerType: streamForm.providerType,
        status: streamForm.status,
        isPrimary: streamForm.isPrimary,
        coverImageUrl: streamForm.coverImageUrl.trim(),
        scheduleSummary: streamForm.scheduleSummary.trim(),
        description: streamForm.description.trim(),
        orderIndex: Number(streamForm.orderIndex) || livestreams.length + 1,
        cropZoom: streamForm.cropZoom,
        cropX: streamForm.cropX,
        cropY: streamForm.cropY,
        cropTop: streamForm.cropTop,
        cropBottom: streamForm.cropBottom,
        cropLeft: streamForm.cropLeft,
        cropRight: streamForm.cropRight,
      });
      notify('success', 'Livestream feed & video crop saved for all users.');
      setStreamForm({
        id: '',
        title: '',
        cameraLabel: '',
        streamUrl: '',
        providerType: 'none',
        status: 'offline',
        isPrimary: false,
        coverImageUrl: '',
        scheduleSummary: '',
        description: '',
        orderIndex: livestreams.length + 2,
        ...DEFAULT_YOUTUBE_CROP,
      });
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to save livestream.');
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = schedForm.id || `sched-${Date.now().toString(36)}`;
      await saveScheduleItem({
        id,
        title: schedForm.title.trim(),
        category: schedForm.category,
        startTime: schedForm.startTime.trim(),
        endTime: schedForm.endTime.trim(),
        targetDateIso: schedForm.targetDateIso.trim(),
        cameraLabel: schedForm.cameraLabel.trim(),
        description: schedForm.description.trim(),
        isUpcoming: schedForm.isUpcoming,
      });
      notify('success', 'Schedule activity saved.');
      setSchedForm({
        id: '',
        title: '',
        category: 'livestream',
        startTime: '',
        endTime: '',
        targetDateIso: '',
        cameraLabel: 'Camera 1 · Main House',
        description: '',
        isUpcoming: true,
      });
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to save schedule item.');
    }
  };

  const handleArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = articleForm.id || `news-${Date.now().toString(36)}`;
      const slug = slugify(articleForm.title) || id;
      const imageUrl =
        articleForm.imageUrl ||
        createEditorialCoverSvg({
          title: articleForm.title,
          accent: '#D4AF37',
          theme: 'studio',
        });

      await saveArticle(
        {
          id,
          slug,
          title: articleForm.title.trim(),
          category: articleForm.category,
          excerpt: articleForm.excerpt.trim(),
          content: articleForm.content.trim(),
          imageUrl,
          featured_image: imageUrl,
          source_name: 'PINOY BIG BROTHER 3.0',
          authorName: articleForm.authorName.trim() || 'PINOY BIG BROTHER 3.0 Editorial',
          featured: articleForm.featured,
          publishedAt: new Date(articleForm.publishedAt).toISOString(),
          published_at: new Date(articleForm.publishedAt).toISOString(),
          approval_status: 'approved',
        },
        articleForm.isNew
      );
      notify('success', articleForm.isNew ? 'Article published.' : 'Article updated.');
      setArticleForm({
        id: '',
        isNew: true,
        title: '',
        category: 'Latest News',
        excerpt: '',
        content: '',
        imageUrl: '',
        authorName: 'PINOY BIG BROTHER 3.0 Editorial',
        featured: false,
        publishedAt: new Date().toISOString().slice(0, 16),
      });
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to save article.');
    }
  };

  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = annForm.id || `ann-${Date.now().toString(36)}`;
      await saveAnnouncement(
        {
          id,
          title: annForm.title.trim(),
          message: annForm.message.trim(),
          priority: annForm.priority,
          active: annForm.active,
          linkUrl: annForm.linkUrl.trim() || '/news',
        },
        annForm.isNew
      );
      notify('success', 'Announcement saved.');
      setAnnForm({
        id: '',
        isNew: true,
        title: '',
        message: '',
        priority: 'normal',
        active: true,
        linkUrl: '/news',
      });
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to save announcement.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSiteSettings(settingsForm);
      notify('success', 'Website settings updated.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to update settings.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-white/10 pb-6">
        <div>
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            Admin Console · {user.email}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white">
            PINOY BIG BROTHER 3.0 Management
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              await seedFirestoreIfEmpty(true);
              notify('success', 'Database synchronized with initial sample content.');
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-white/15 px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:border-amber-500/50 cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync Sample Data
          </button>
          <button
            type="button"
            onClick={async () => {
              await updateSiteSettings({ maintenanceMode: !siteSettings.maintenanceMode });
              notify(
                'success',
                !siteSettings.maintenanceMode
                  ? 'Maintenance mode enabled for public visitors.'
                  : 'Maintenance mode disabled. Public site restored.'
              );
            }}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              siteSettings.maintenanceMode
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'bg-zinc-950 dark:bg-white/10 text-white hover:bg-zinc-800 dark:hover:bg-white/20'
            }`}
          >
            {siteSettings.maintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-xl border p-4 flex items-center gap-2.5 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{notice.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-white/10 pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.key
                ? 'bg-amber-500 text-zinc-950 font-semibold'
                : 'border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] text-zinc-700 dark:text-zinc-300 hover:border-amber-500/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-5 space-y-1">
              <p className="text-xs text-zinc-500">Total Website Visitors</p>
              <p className="font-mono-tabular text-3xl font-bold text-zinc-950 dark:text-white">
                {visitorCount.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-5 space-y-1">
              <p className="text-xs text-zinc-500">Registered Users</p>
              <p className="font-mono-tabular text-3xl font-bold text-zinc-950 dark:text-white">
                {allUsers.length.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-5 space-y-1">
              <p className="text-xs text-zinc-500">Total Fan Poll Votes</p>
              <p className="font-mono-tabular text-3xl font-bold text-amber-600 dark:text-amber-400">
                {totalFanVotes.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-5 space-y-1">
              <p className="text-xs text-zinc-500">Active Open Polls</p>
              <p className="font-mono-tabular text-3xl font-bold text-zinc-950 dark:text-white">
                {activePollsCount}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-500" />
                Recent Admin Activities
              </h2>
              <span className="text-xs text-zinc-500 font-mono-tabular">
                {activityLogs.length} logged actions
              </span>
            </div>

            {activityLogs.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4">
                No recent admin activities logged yet.
              </p>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-white/10">
                {activityLogs.slice(0, 12).map((log) => (
                  <div
                    key={log.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
                  >
                    <div>
                      <span className="font-semibold text-zinc-950 dark:text-white">
                        {log.action}
                      </span>{' '}
                      <span className="text-zinc-500">· {log.details}</span>
                    </div>
                    <span className="text-xs text-zinc-500 font-mono-tabular">
                      {log.actorEmail}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1B. RANKINGS & CATEGORIES MANAGEMENT */}
      {activeTab === 'rankings' && (
        <div className="space-y-12">
          {/* Categories Add / Edit / List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <form
              onSubmit={handleCategorySubmit}
              className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
                  {catForm.isNew ? 'Add Ranking Category' : `Edit ${catForm.shortLabel}`}
                </h2>
                {!catForm.isNew && (
                  <button
                    type="button"
                    onClick={() =>
                      setCatForm({
                        id: '',
                        isNew: true,
                        title: '',
                        shortLabel: '',
                        subtitle: 'COMMUNITY SENTIMENT · LIVE POWER RANKING',
                        seasonHeader: 'PBB COLLAB 3.0 HOUSEMATES',
                        actionLabel: 'Vote',
                        valueColumnLabel: 'VOTES',
                        isOpen: true,
                        orderIndex: rankingCategories.length + 1,
                        housemateIds: housemates.map((h) => h.id),
                        counts: {},
                      })
                    }
                    className="text-xs font-semibold text-amber-500 hover:underline cursor-pointer"
                  >
                    New Category
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Category Title (Big Header)
                  </label>
                  <input
                    type="text"
                    required
                    value={catForm.title}
                    onChange={(e) => setCatForm({ ...catForm, title: e.target.value })}
                    placeholder="e.g. VOTE TO NOMINATE"
                    className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Tab Label
                  </label>
                  <input
                    type="text"
                    required
                    value={catForm.shortLabel}
                    onChange={(e) => setCatForm({ ...catForm, shortLabel: e.target.value })}
                    placeholder="e.g. NOMINATE"
                    className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Top Yellow Header
                  </label>
                  <input
                    type="text"
                    required
                    value={catForm.seasonHeader}
                    onChange={(e) => setCatForm({ ...catForm, seasonHeader: e.target.value })}
                    placeholder="PBB COLLAB 3.0 HOUSEMATES"
                    className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Vote Button Verb
                  </label>
                  <input
                    type="text"
                    required
                    value={catForm.actionLabel}
                    onChange={(e) => setCatForm({ ...catForm, actionLabel: e.target.value })}
                    placeholder="e.g. Nominate / Save / Support"
                    className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Black Sub-Banner Text
                </label>
                <input
                  type="text"
                  value={catForm.subtitle}
                  onChange={(e) => setCatForm({ ...catForm, subtitle: e.target.value })}
                  placeholder="COMMUNITY SENTIMENT · NOMINATION TRACKER"
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Score Column Label
                  </label>
                  <input
                    type="text"
                    required
                    value={catForm.valueColumnLabel}
                    onChange={(e) => setCatForm({ ...catForm, valueColumnLabel: e.target.value })}
                    placeholder="NOMINATES / SAVES / VOTES"
                    className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Tab Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={catForm.orderIndex}
                    onChange={(e) =>
                      setCatForm({ ...catForm, orderIndex: Number(e.target.value) || 1 })
                    }
                    className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Included Housemates &amp; Vote Tallies (Auto-Ranks Highest First)
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setCatForm({
                        ...catForm,
                        housemateIds: housemates.map((h) => h.id),
                      })
                    }
                    className="text-[11px] font-semibold text-amber-500 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-zinc-200 dark:border-white/10 p-2.5 space-y-2">
                  {housemates.map((hm) => {
                    const checked = catForm.housemateIds.includes(hm.id);
                    const countVal = catForm.counts[hm.id] ?? 0;
                    return (
                      <div
                        key={hm.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <label className="flex items-center gap-2 min-w-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const nextIds = e.target.checked
                                ? [...catForm.housemateIds, hm.id]
                                : catForm.housemateIds.filter((id) => id !== hm.id);
                              setCatForm({ ...catForm, housemateIds: nextIds });
                            }}
                            className="accent-amber-500 shrink-0"
                          />
                          <img
                            src={hm.photoUrl}
                            alt={hm.fullName}
                            className="h-6 w-6 rounded-full object-cover shrink-0 bg-zinc-900"
                          />
                          <span className="truncate text-zinc-800 dark:text-zinc-200 font-medium">
                            {hm.fullName}
                          </span>
                        </label>
                        {checked && (
                          <input
                            type="number"
                            min={0}
                            aria-label={`${hm.fullName} vote count`}
                            value={countVal}
                            onChange={(e) =>
                              setCatForm({
                                ...catForm,
                                counts: {
                                  ...catForm.counts,
                                  [hm.id]: Math.max(0, Number(e.target.value) || 0),
                                },
                              })
                            }
                            className="w-24 rounded-md border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-2 py-1 text-right font-mono-tabular text-xs text-zinc-950 dark:text-white shrink-0"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={catForm.isOpen}
                  onChange={(e) => setCatForm({ ...catForm, isOpen: e.target.checked })}
                  className="h-4 w-4 accent-amber-500"
                />
                Voting Open to Community
              </label>

              <button
                type="submit"
                className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 cursor-pointer"
              >
                {catForm.isNew ? 'Add Ranking Category' : 'Save Category Changes'}
              </button>
            </form>

            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
                  Active Ranking Categories ({rankingCategories.length})
                </h2>
                <Link
                  to="/voting"
                  className="text-xs font-semibold text-amber-500 hover:underline"
                >
                  View Live Board →
                </Link>
              </div>

              {[...rankingCategories]
                .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
                .map((cat: RankingCategory) => {
                  const top3 = [...(cat.housemateIds || [])]
                    .map((hid) => ({
                      hm: housemates.find((h) => h.id === hid),
                      count: cat.counts?.[hid] || 0,
                    }))
                    .filter((item) => Boolean(item.hm))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 3);

                  return (
                    <div
                      key={cat.id}
                      className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-5 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-mono-tabular font-bold uppercase text-amber-600 dark:text-amber-400">
                            {cat.shortLabel} · {cat.isOpen ? 'OPEN' : 'CLOSED'} ·{' '}
                            {cat.totalVotes.toLocaleString()} votes
                          </p>
                          <h3 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
                            {cat.title}
                          </h3>
                          <p className="text-xs text-zinc-500">{cat.subtitle}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await saveRankingCategory({ ...cat, isOpen: !cat.isOpen }, false);
                              notify(
                                'success',
                                `${cat.shortLabel} marked ${!cat.isOpen ? 'open' : 'closed'}.`
                              );
                            }}
                            className="rounded-lg border border-zinc-300 dark:border-white/15 px-3 py-1.5 text-xs font-semibold hover:border-amber-500 cursor-pointer"
                          >
                            {cat.isOpen ? 'Close' : 'Open'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCatForm({
                                id: cat.id,
                                isNew: false,
                                title: cat.title,
                                shortLabel: cat.shortLabel,
                                subtitle: cat.subtitle,
                                seasonHeader: cat.seasonHeader,
                                actionLabel: cat.actionLabel,
                                valueColumnLabel: cat.valueColumnLabel,
                                isOpen: cat.isOpen,
                                orderIndex: cat.orderIndex,
                                housemateIds: cat.housemateIds || [],
                                counts: { ...(cat.counts || {}) },
                              })
                            }
                            className="rounded-lg border border-zinc-300 dark:border-white/15 px-3 py-1.5 text-xs font-medium hover:border-amber-500 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                label: `Delete ranking category "${cat.title}"?`,
                                onConfirm: async () => {
                                  await deleteRankingCategory(cat.id);
                                  notify('success', `Deleted ${cat.title}.`);
                                },
                              })
                            }
                            className="rounded-lg border border-red-500/30 p-1.5 text-red-500 hover:bg-red-500/10 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {top3.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-zinc-200 dark:border-white/10">
                          {top3.map((entry, idx) => (
                            <div
                              key={entry.hm!.id}
                              className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 dark:bg-white/5 px-3 py-2 text-xs"
                            >
                              <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                                0{idx + 1} · {entry.hm!.fullName}
                              </span>
                              <span className="font-mono-tabular font-bold text-amber-600 dark:text-amber-400 shrink-0">
                                {entry.count.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Housemates Picture, Name & Location Manager */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start border-t border-zinc-200 dark:border-white/10 pt-8">
            <form
              onSubmit={handleQuickHmSubmit}
              className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
                  {quickHmForm.isNew
                    ? 'Add Housemate (Picture, Name & Location)'
                    : `Edit ${quickHmForm.fullName}`}
                </h2>
                {!quickHmForm.isNew && (
                  <button
                    type="button"
                    onClick={() =>
                      setQuickHmForm({
                        id: '',
                        isNew: true,
                        fullName: '',
                        hometown: '',
                        photoUrl: '',
                        status: 'active',
                      })
                    }
                    className="text-xs font-semibold text-amber-500 hover:underline cursor-pointer"
                  >
                    New Housemate
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full border-2 border-amber-500 bg-zinc-900 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-amber-400">
                  {quickHmForm.photoUrl ? (
                    <img
                      src={quickHmForm.photoUrl}
                      alt="Housemate portrait preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{(quickHmForm.fullName.slice(0, 2) || 'HM').toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Housemate Picture
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-white/15 px-3 py-2 text-xs font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/5 shrink-0">
                      <Upload className="h-3.5 w-3.5" />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const url = await compressImageFile(f, 600, 0.78);
                          setQuickHmForm({ ...quickHmForm, photoUrl: url });
                        }}
                      />
                    </label>
                    <input
                      type="text"
                      value={quickHmForm.photoUrl}
                      onChange={(e) =>
                        setQuickHmForm({ ...quickHmForm, photoUrl: e.target.value })
                      }
                      placeholder="Image URL or upload"
                      className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-950 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Housemate Name
                </label>
                <input
                  type="text"
                  required
                  value={quickHmForm.fullName}
                  onChange={(e) => setQuickHmForm({ ...quickHmForm, fullName: e.target.value })}
                  placeholder="e.g. Jeo Ong"
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    required
                    value={quickHmForm.hometown}
                    onChange={(e) =>
                      setQuickHmForm({ ...quickHmForm, hometown: e.target.value })
                    }
                    placeholder="e.g. Quezon City, Metro Manila"
                    className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Status
                  </label>
                  <select
                    value={quickHmForm.status}
                    onChange={(e) =>
                      setQuickHmForm({
                        ...quickHmForm,
                        status: e.target.value as HousemateStatus,
                      })
                    }
                    className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="nominated">Nominated</option>
                    <option value="evicted">Evicted</option>
                    <option value="winner">Winner</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 cursor-pointer"
              >
                {quickHmForm.isNew ? 'Add Housemate' : 'Save Picture, Name & Location'}
              </button>
            </form>

            <div className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
                Housemates Pictures, Names &amp; Locations ({housemates.length})
              </h2>
              <div className="divide-y divide-zinc-200 dark:divide-white/10">
                {housemates.map((hm) => (
                  <div
                    key={hm.id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={hm.photoUrl}
                        alt={hm.fullName}
                        referrerPolicy="no-referrer"
                        className="h-11 w-11 rounded-full border border-zinc-300 dark:border-white/15 object-cover shrink-0 bg-zinc-900"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                          {hm.fullName}
                        </p>
                        <p className="text-xs text-zinc-500 truncate flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span>{hm.hometown}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setQuickHmForm({
                            id: hm.id,
                            isNew: false,
                            fullName: hm.fullName,
                            hometown: hm.hometown,
                            photoUrl: hm.photoUrl,
                            status: hm.status,
                          })
                        }
                        className="rounded-lg border border-zinc-300 dark:border-white/15 px-3 py-1.5 text-xs font-medium hover:border-amber-500 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({
                            label: `Remove housemate ${hm.fullName}?`,
                            onConfirm: async () => {
                              await deleteHousemate(hm.id);
                              notify('success', `Removed ${hm.fullName}.`);
                            },
                          })
                        }
                        aria-label={`Remove ${hm.fullName}`}
                        className="rounded-lg border border-red-500/30 p-1.5 text-red-500 hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. HOUSEMATE MANAGEMENT */}
      {activeTab === 'housemates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleHmSubmit}
            className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
                {hmForm.isNew ? 'Add Housemate' : `Edit ${hmForm.nickname}`}
              </h2>
              {!hmForm.isNew && (
                <button
                  type="button"
                  onClick={() =>
                    setHmForm({
                      id: '',
                      isNew: true,
                      fullName: '',
                      nickname: '',
                      age: '',
                      hometown: '',
                      tagline: '',
                      biography: '',
                      status: 'active',
                      network: 'Kapamilya',
                      isImmune: false,
                      nominationPoints: '',
                      photoUrl: '',
                      featured: false,
                      enteredDay: 1,
                      orderIndex: housemates.length + 1,
                    })
                  }
                  className="text-xs font-semibold text-amber-500 hover:underline cursor-pointer"
                >
                  New Housemate
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={hmForm.fullName}
                  onChange={(e) => setHmForm({ ...hmForm, fullName: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Nickname
                </label>
                <input
                  type="text"
                  required
                  value={hmForm.nickname}
                  onChange={(e) => setHmForm({ ...hmForm, nickname: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Age (Optional)
                </label>
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={hmForm.age}
                  onChange={(e) => setHmForm({ ...hmForm, age: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Status
                </label>
                <select
                  value={hmForm.status}
                  onChange={(e) =>
                    setHmForm({ ...hmForm, status: e.target.value as HousemateStatus })
                  }
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="nominated">Nominated</option>
                  <option value="evicted">Evicted</option>
                  <option value="winner">Winner</option>
                  <option value="guest">Guest</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Entered Day
                </label>
                <input
                  type="number"
                  min={1}
                  value={hmForm.enteredDay}
                  onChange={(e) =>
                    setHmForm({ ...hmForm, enteredDay: Number(e.target.value) || 1 })
                  }
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Network / Group
                </label>
                <select
                  value={hmForm.network}
                  onChange={(e) =>
                    setHmForm({ ...hmForm, network: e.target.value as HousemateNetwork })
                  }
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                >
                  <option value="Kapamilya">Kapamilya</option>
                  <option value="Kapuso">Kapuso</option>
                  <option value="House Guest">House Guest</option>
                  <option value="Evicted">Evicted</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Nomination Points
                </label>
                <input
                  type="number"
                  min={0}
                  value={hmForm.nominationPoints}
                  onChange={(e) => setHmForm({ ...hmForm, nominationPoints: e.target.value })}
                  placeholder="Optional (e.g. 12)"
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={hmForm.isImmune}
                onChange={(e) => setHmForm({ ...hmForm, isImmune: e.target.checked })}
                className="h-4 w-4 accent-emerald-500"
              />
              Ligtask Winner (Immune from Nomination)
            </label>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Location (Hometown / City)
              </label>
              <input
                type="text"
                required
                value={hmForm.hometown}
                onChange={(e) => setHmForm({ ...hmForm, hometown: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Tagline
              </label>
              <input
                type="text"
                value={hmForm.tagline}
                onChange={(e) => setHmForm({ ...hmForm, tagline: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Biography
              </label>
              <textarea
                rows={4}
                required
                value={hmForm.biography}
                onChange={(e) => setHmForm({ ...hmForm, biography: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Profile Picture (Upload or Image URL)
              </label>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-white/15 px-3 py-2 text-xs font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/5 shrink-0">
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = await compressImageFile(f, 600, 0.78);
                      setHmForm({ ...hmForm, photoUrl: url });
                    }}
                  />
                </label>
                <input
                  type="text"
                  value={hmForm.photoUrl}
                  onChange={(e) => setHmForm({ ...hmForm, photoUrl: e.target.value })}
                  placeholder="Optional image URL or uploaded data"
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-950 dark:text-white"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={hmForm.featured}
                onChange={(e) => setHmForm({ ...hmForm, featured: e.target.checked })}
                className="h-4 w-4 accent-amber-500"
              />
              Feature on Homepage
            </label>

            <button
              type="submit"
              className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 transition-colors cursor-pointer"
            >
              {hmForm.isNew ? 'Add Housemate' : 'Save Housemate Changes'}
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
              Housemates Roster ({housemates.length})
            </h2>
            <div className="divide-y divide-zinc-200 dark:divide-white/10">
              {housemates.map((hm) => (
                <div
                  key={hm.id}
                  className="py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={hm.photoUrl}
                      alt={hm.fullName}
                      referrerPolicy="no-referrer"
                      className="h-11 w-11 rounded-lg object-cover shrink-0 bg-zinc-900"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                        {hm.fullName} ({hm.nickname})
                      </p>
                      <p className="text-xs text-zinc-500 truncate capitalize">
                        {hm.status} · {hm.hometown}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                          setHmForm({
                          id: hm.id,
                          isNew: false,
                          fullName: hm.fullName,
                          nickname: hm.nickname,
                          age: hm.age ? String(hm.age) : '',
                          hometown: hm.hometown,
                          tagline: hm.tagline,
                          biography: hm.biography,
                          status: hm.status,
                          network: hm.network || 'Kapamilya',
                          isImmune: Boolean(hm.isImmune),
                          nominationPoints:
                            typeof hm.nominationPoints === 'number'
                              ? String(hm.nominationPoints)
                              : '',
                          photoUrl: hm.photoUrl,
                          featured: hm.featured,
                          enteredDay: hm.enteredDay,
                          orderIndex: hm.orderIndex,
                        })
                      }
                      className="rounded-lg border border-zinc-300 dark:border-white/15 px-3 py-1.5 text-xs font-medium hover:border-amber-500 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDelete({
                          label: `Delete housemate ${hm.fullName}?`,
                          onConfirm: async () => {
                            await deleteHousemate(hm.id);
                            notify('success', `Deleted ${hm.fullName}.`);
                          },
                        })
                      }
                      aria-label={`Delete ${hm.fullName}`}
                      className="rounded-lg border border-red-500/30 p-1.5 text-red-500 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. VOTING MANAGEMENT */}
      {activeTab === 'voting' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handlePollSubmit}
            className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
                {pollForm.isNew ? 'Create Fan Poll' : 'Edit Fan Poll'}
              </h2>
              {!pollForm.isNew && (
                <button
                  type="button"
                  onClick={() =>
                    setPollForm({
                      id: '',
                      isNew: true,
                      title: '',
                      description: '',
                      instructions:
                        'Sign in with a verified account and select one housemate. Unofficial community fan poll.',
                      status: 'open',
                      startDate: new Date().toISOString().slice(0, 16),
                      endDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 16),
                      housemateIds: [],
                      isFeatured: false,
                      totalVotes: 0,
                      optionCounts: {},
                    })
                  }
                  className="text-xs font-semibold text-amber-500 hover:underline cursor-pointer"
                >
                  New Poll
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Poll Title
              </label>
              <input
                type="text"
                required
                value={pollForm.title}
                onChange={(e) => setPollForm({ ...pollForm, title: e.target.value })}
                placeholder="e.g. Week 7 Community Save Fan Poll"
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                required
                value={pollForm.description}
                onChange={(e) => setPollForm({ ...pollForm, description: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Voting Instructions
              </label>
              <textarea
                rows={2}
                required
                value={pollForm.instructions}
                onChange={(e) => setPollForm({ ...pollForm, instructions: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Status
                </label>
                <select
                  value={pollForm.status}
                  onChange={(e) =>
                    setPollForm({ ...pollForm, status: e.target.value as PollStatus })
                  }
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  required
                  value={pollForm.startDate}
                  onChange={(e) => setPollForm({ ...pollForm, startDate: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-2 py-2 text-xs text-zinc-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  required
                  value={pollForm.endDate}
                  onChange={(e) => setPollForm({ ...pollForm, endDate: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-2 py-2 text-xs text-zinc-950 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Participating Housemates
              </p>
              <div className="max-h-44 overflow-y-auto rounded-lg border border-zinc-200 dark:border-white/10 p-2.5 space-y-1.5">
                {housemates.map((hm) => {
                  const checked = pollForm.housemateIds.includes(hm.id);
                  return (
                    <label
                      key={hm.id}
                      className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...pollForm.housemateIds, hm.id]
                            : pollForm.housemateIds.filter((id) => id !== hm.id);
                          setPollForm({ ...pollForm, housemateIds: next });
                        }}
                        className="accent-amber-500"
                      />
                      <span>
                        {hm.fullName} ({hm.nickname})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={pollForm.isFeatured}
                onChange={(e) => setPollForm({ ...pollForm, isFeatured: e.target.checked })}
                className="h-4 w-4 accent-amber-500"
              />
              Feature Poll on Homepage
            </label>

            <button
              type="submit"
              className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 cursor-pointer"
            >
              {pollForm.isNew ? 'Create Fan Poll' : 'Update Fan Poll'}
            </button>
          </form>

          <div className="lg:col-span-7 space-y-4">
            {fanPolls.map((poll: FanPoll) => (
              <div
                key={poll.id}
                className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono-tabular text-amber-600 dark:text-amber-400 uppercase font-bold">
                      {poll.status} · {poll.totalVotes.toLocaleString()} votes
                    </div>
                    <h3 className="font-display text-lg font-bold text-zinc-950 dark:text-white mt-1">
                      {poll.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const nextStatus: PollStatus = poll.status === 'open' ? 'closed' : 'open';
                        await savePoll({ ...poll, status: nextStatus }, false);
                        notify('success', `Poll marked ${nextStatus}.`);
                      }}
                      className="rounded-lg border border-zinc-300 dark:border-white/15 px-3 py-1.5 text-xs font-semibold hover:border-amber-500 cursor-pointer"
                    >
                      {poll.status === 'open' ? 'Close Voting' : 'Open Voting'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPollForm({
                          id: poll.id,
                          isNew: false,
                          title: poll.title,
                          description: poll.description,
                          instructions: poll.instructions,
                          status: poll.status,
                          startDate: new Date(poll.startDate).toISOString().slice(0, 16),
                          endDate: new Date(poll.endDate).toISOString().slice(0, 16),
                          housemateIds: poll.housemateIds,
                          isFeatured: poll.isFeatured,
                          totalVotes: poll.totalVotes,
                          optionCounts: poll.optionCounts || {},
                        })
                      }
                      className="rounded-lg border border-zinc-300 dark:border-white/15 px-3 py-1.5 text-xs font-medium cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDelete({
                          label: `Delete fan poll "${poll.title}"?`,
                          onConfirm: async () => {
                            await deletePoll(poll.id);
                            notify('success', 'Fan poll deleted.');
                          },
                        })
                      }
                      className="rounded-lg border border-red-500/30 p-1.5 text-red-500 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-200 dark:border-white/10">
                  {poll.housemateIds.map((hid) => {
                    const hm = housemates.find((h) => h.id === hid);
                    const count = poll.optionCounts?.[hid] || 0;
                    return (
                      <div
                        key={hid}
                        className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300"
                      >
                        <span>{hm?.fullName || hid}</span>
                        <span className="font-mono-tabular font-semibold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. LIVESTREAM MANAGEMENT */}
      {activeTab === 'livestreams' && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <form
              onSubmit={handleStreamSubmit}
              className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4"
            >
              <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
                {streamForm.id ? `Edit ${streamForm.cameraLabel}` : 'Add Authorized Camera Feed'}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Camera Label
                  </label>
                  <input
                    type="text"
                    required
                    value={streamForm.cameraLabel}
                    onChange={(e) => setStreamForm({ ...streamForm, cameraLabel: e.target.value })}
                    placeholder="Camera 1 · Main House"
                    className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Feed Status
                  </label>
                  <select
                    value={streamForm.status}
                    onChange={(e) =>
                      setStreamForm({ ...streamForm, status: e.target.value as LivestreamStatus })
                    }
                    className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                  >
                    <option value="live">Live Now</option>
                    <option value="offline">Offline</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Feed Title
                </label>
                <input
                  type="text"
                  required
                  value={streamForm.title}
                  onChange={(e) => setStreamForm({ ...streamForm, title: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Authorized Source Type
                  </label>
                  <select
                    value={streamForm.providerType}
                    onChange={(e) =>
                      setStreamForm({
                        ...streamForm,
                        providerType: e.target.value as LivestreamProvider,
                      })
                    }
                    className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                  >
                    <option value="none">No Stream (Offline Placeholder)</option>
                    <option value="youtube">Official YouTube Embed/URL</option>
                    <option value="iframe">Authorized Iframe Embed</option>
                    <option value="external">Official External Link</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Authorized Stream URL
                  </label>
                  <input
                    type="url"
                    value={streamForm.streamUrl}
                    onChange={(e) => setStreamForm({ ...streamForm, streamUrl: e.target.value })}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Schedule Summary
                </label>
                <input
                  type="text"
                  value={streamForm.scheduleSummary}
                  onChange={(e) =>
                    setStreamForm({ ...streamForm, scheduleSummary: e.target.value })
                  }
                  placeholder="Daily 10:00 AM – 12:00 AM PHT"
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Feed Description
                </label>
                <textarea
                  rows={2}
                  value={streamForm.description}
                  onChange={(e) => setStreamForm({ ...streamForm, description: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Cover Photo (Shown when Unavailable / Offline)
                </label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-white/15 px-3 py-2 text-xs font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/5 shrink-0">
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const url = await compressImageFile(f, 1000, 0.78);
                        setStreamForm({ ...streamForm, coverImageUrl: url });
                      }}
                    />
                  </label>
                  <input
                    type="text"
                    value={streamForm.coverImageUrl}
                    onChange={(e) =>
                      setStreamForm({ ...streamForm, coverImageUrl: e.target.value })
                    }
                    placeholder="Image URL or uploaded cover photo"
                    className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-950 dark:text-white"
                  />
                </div>
                {streamForm.coverImageUrl && (
                  <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-white/10 aspect-video max-w-[200px] bg-zinc-900">
                    <img
                      src={streamForm.coverImageUrl}
                      alt="Stream cover preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Live Video Crop & Framing Editor */}
              {(() => {
                const currentCrop: StreamCropConfig = normalizeStreamCrop(
                  streamForm,
                  streamForm.providerType === 'youtube'
                );
                const previewCropClasses = getStreamCropClasses(currentCrop);
                const previewYtId = extractPreviewYouTubeId(streamForm.streamUrl);

                return (
                  <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0B0B10] p-4 space-y-4">
                    <StreamCropControls
                      value={currentCrop}
                      onChange={(next) => setStreamForm({ ...streamForm, ...next })}
                      onReset={() =>
                        setStreamForm({
                          ...streamForm,
                          ...(streamForm.providerType === 'youtube'
                            ? DEFAULT_YOUTUBE_CROP
                            : DEFAULT_FULL_CROP),
                        })
                      }
                    />

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                        Live Viewer Crop Preview (16:9)
                      </p>
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-zinc-300 dark:border-white/10 bg-[#050508]">
                        {previewYtId ? (
                          <div
                            className={`relative h-full w-full overflow-hidden origin-center transition-transform duration-200 ${previewCropClasses.transformClass}`}
                          >
                            <iframe
                              src={`https://www.youtube-nocookie.com/embed/${previewYtId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&fs=0&playsinline=1`}
                              title="Admin Crop Preview"
                              className="absolute inset-x-0 -top-[40%] h-[180%] w-full border-0 pointer-events-none"
                            />
                          </div>
                        ) : streamForm.coverImageUrl ? (
                          <div
                            className={`h-full w-full origin-center transition-transform duration-200 ${previewCropClasses.transformClass}`}
                          >
                            <img
                              src={streamForm.coverImageUrl}
                              alt="Framing preview"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className={`h-full w-full origin-center transition-transform duration-200 flex items-center justify-center bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.18),transparent_70%)] text-xs font-mono-tabular text-zinc-400 ${previewCropClasses.transformClass}`}
                          >
                            16:9 Broadcast Frame ({currentCrop.cropZoom}%)
                          </div>
                        )}
                        <div className={`pointer-events-none absolute inset-x-0 top-0 z-10 bg-[#050508] transition-all duration-200 ${previewCropClasses.topBarClass}`} />
                        <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-[#050508] transition-all duration-200 ${previewCropClasses.bottomBarClass}`} />
                        <div className={`pointer-events-none absolute inset-y-0 left-0 z-10 bg-[#050508] transition-all duration-200 ${previewCropClasses.leftBarClass}`} />
                        <div className={`pointer-events-none absolute inset-y-0 right-0 z-10 bg-[#050508] transition-all duration-200 ${previewCropClasses.rightBarClass}`} />
                      </div>
                    </div>
                  </div>
                );
              })()}

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={streamForm.isPrimary}
                  onChange={(e) => setStreamForm({ ...streamForm, isPrimary: e.target.checked })}
                  className="h-4 w-4 accent-amber-500"
                />
                Primary Camera Feed
              </label>

              <button
                type="submit"
                className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 cursor-pointer"
              >
                Save Livestream Feed
              </button>
            </form>

            <div className="lg:col-span-7 space-y-4">
              {livestreams.map((feed: LivestreamFeed) => (
                <div
                  key={feed.id}
                  className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">
                      {feed.cameraLabel} · {feed.status}
                    </p>
                    <h3 className="font-display text-base font-bold text-zinc-950 dark:text-white">
                      {feed.title}
                    </h3>
                    <p className="text-xs text-zinc-500 truncate max-w-md">
                      {feed.streamUrl || 'No active stream URL configured'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        const next: LivestreamStatus = feed.status === 'live' ? 'offline' : 'live';
                        await saveLivestream({ ...feed, status: next });
                        notify('success', `${feed.cameraLabel} set to ${next}.`);
                      }}
                      className="rounded-lg border border-zinc-300 dark:border-white/15 px-3 py-1.5 text-xs font-semibold cursor-pointer"
                    >
                      {feed.status === 'live' ? 'Set Offline' : 'Set Live'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const normalized = normalizeStreamCrop(
                          feed,
                          feed.providerType === 'youtube'
                        );
                        setStreamForm({
                          id: feed.id,
                          title: feed.title,
                          cameraLabel: feed.cameraLabel,
                          streamUrl: feed.streamUrl,
                          providerType: feed.providerType,
                          status: feed.status,
                          isPrimary: feed.isPrimary,
                          coverImageUrl: feed.coverImageUrl || '',
                          scheduleSummary: feed.scheduleSummary,
                          description: feed.description,
                          orderIndex: feed.orderIndex,
                          ...normalized,
                        });
                      }}
                      className="rounded-lg border border-zinc-300 dark:border-white/15 px-3 py-1.5 text-xs font-medium cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDelete({
                          label: `Remove ${feed.cameraLabel}?`,
                          onConfirm: async () => {
                            await deleteLivestream(feed.id);
                            notify('success', 'Camera feed removed.');
                          },
                        })
                      }
                      className="rounded-lg border border-red-500/30 p-1.5 text-red-500 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule & Upcoming Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start border-t border-zinc-200 dark:border-white/10 pt-8">
            <form
              onSubmit={handleScheduleSubmit}
              className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
                  {schedForm.id ? 'Edit Schedule / Activity' : 'Add Livestream Schedule / Activity'}
                </h2>
                {schedForm.id && (
                  <button
                    type="button"
                    onClick={() =>
                      setSchedForm({
                        id: '',
                        title: '',
                        category: 'livestream',
                        startTime: '',
                        endTime: '',
                        targetDateIso: '',
                        cameraLabel: 'Camera 1 · Main House',
                        description: '',
                        isUpcoming: true,
                      })
                    }
                    className="text-xs font-semibold text-amber-500 hover:underline cursor-pointer"
                  >
                    New Event
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={schedForm.title}
                onChange={(e) => setSchedForm({ ...schedForm, title: e.target.value })}
                placeholder="Event title"
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={schedForm.category}
                  onChange={(e) =>
                    setSchedForm({ ...schedForm, category: e.target.value as ScheduleCategory })
                  }
                  className="rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                >
                  <option value="livestream">Livestream</option>
                  <option value="challenge">Challenge</option>
                  <option value="nomination">Nomination</option>
                  <option value="eviction">Eviction</option>
                  <option value="special">Special</option>
                </select>
                <input
                  type="text"
                  required
                  value={schedForm.startTime}
                  onChange={(e) => setSchedForm({ ...schedForm, startTime: e.target.value })}
                  placeholder="e.g. Sunday · 08:00 PM PHT"
                  className="rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="sched-target-iso"
                  className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400"
                >
                  Exact Countdown Target (Optional, PHT)
                </label>
                <input
                  id="sched-target-iso"
                  type="datetime-local"
                  value={schedForm.targetDateIso.slice(0, 16)}
                  onChange={(e) =>
                    setSchedForm({ ...schedForm, targetDateIso: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>
              <input
                type="text"
                value={schedForm.cameraLabel}
                onChange={(e) => setSchedForm({ ...schedForm, cameraLabel: e.target.value })}
                placeholder="Camera label"
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
              />
              <textarea
                rows={2}
                required
                value={schedForm.description}
                onChange={(e) => setSchedForm({ ...schedForm, description: e.target.value })}
                placeholder="Brief activity description"
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Save Schedule Event
              </button>
            </form>

            <div className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-3">
              <h3 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
                Current Broadcast Schedule ({schedule.length})
              </h3>
              <div className="divide-y divide-zinc-200 dark:divide-white/10">
                {schedule.map((evt: ScheduleItem) => (
                  <div key={evt.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-mono-tabular text-amber-600 dark:text-amber-400">
                        {evt.startTime} · {evt.category}
                        {evt.targetDateIso ? ` · Target: ${evt.targetDateIso.slice(0, 16)}` : ''}
                      </p>
                      <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                        {evt.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setSchedForm({
                            id: evt.id,
                            title: evt.title,
                            category: evt.category,
                            startTime: evt.startTime,
                            endTime: evt.endTime,
                            targetDateIso: evt.targetDateIso || '',
                            cameraLabel: evt.cameraLabel,
                            description: evt.description,
                            isUpcoming: evt.isUpcoming,
                          })
                        }
                        className="rounded-lg border border-zinc-300 dark:border-white/15 px-2.5 py-1 text-xs font-medium hover:border-amber-500 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({
                            label: `Remove scheduled event "${evt.title}"?`,
                            onConfirm: async () => {
                              await deleteScheduleItem(evt.id);
                              notify('success', 'Schedule event removed.');
                            },
                          })
                        }
                        className="rounded-lg border border-red-500/30 p-1.5 text-red-500 hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONTENT & AUTOMATED NEWS MANAGEMENT */}
      {activeTab === 'content' && (
        <div className="space-y-10">
          {/* Automated Official News Control Center (GMA Network & ABS-CBN) */}
          <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-200 dark:border-white/10 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Globe className="h-4 w-4" />
                  <span>Verified Official Publishers Only · gmanetwork.com &amp; abs-cbn.com</span>
                </div>
                <h2 className="font-display text-xl font-bold text-zinc-950 dark:text-white">
                  Automated PBB Collab 3.0 News &amp; Updates System
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Checks GMA Network and ABS-CBN every 30 minutes, enforces canonical URL deduplication, and retains published items if a publisher feed is unreachable.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={refreshAdminNewsStatus}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-white/15 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-amber-500/60 cursor-pointer"
                >
                  Sync Status
                </button>
                <button
                  type="button"
                  disabled={newsRefreshing}
                  onClick={async () => {
                    setNewsRefreshing(true);
                    try {
                      const log = await refreshOfficialNewsNow();
                      if (log) {
                        notify(
                          log.status === 'error' ? 'error' : 'success',
                          `Official news refresh finished: ${log.discoveredCount} PBB Collab 3.0 matched, ${log.newArticlesAdded} new added, ${log.duplicatesSkipped} duplicates skipped.`
                        );
                      }
                    } catch (err) {
                      notify('error', err instanceof Error ? err.message : 'Manual news refresh failed.');
                    } finally {
                      setNewsRefreshing(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${newsRefreshing ? 'animate-spin' : ''}`} />
                  {newsRefreshing ? 'Checking GMA & ABS-CBN...' : 'Manually Refresh News'}
                </button>
              </div>
            </div>

            {/* Automation Toggles & Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-white/10 p-4 cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-zinc-950 dark:text-white">
                    Automatic 30-Min Fetching
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {adminNewsState?.config.enabled ? 'Active every 30 mins' : 'Paused by Admin'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={adminNewsState?.config.enabled ?? true}
                  onChange={async (e) => {
                    try {
                      await updateNewsAutomationConfig({ enabled: e.target.checked });
                      notify('success', `Automatic news fetching ${e.target.checked ? 'enabled' : 'disabled'}.`);
                    } catch (err) {
                      notify('error', err instanceof Error ? err.message : 'Update failed.');
                    }
                  }}
                  className="h-4 w-4 accent-amber-500"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-white/10 p-4 cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-zinc-950 dark:text-white">
                    Publishing Mode
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {adminNewsState?.config.autoPublish
                      ? 'Auto-Publish Verified Stories'
                      : 'Require Manual Approval'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={adminNewsState?.config.autoPublish ?? true}
                  onChange={async (e) => {
                    try {
                      await updateNewsAutomationConfig({ autoPublish: e.target.checked });
                      notify(
                        'success',
                        e.target.checked
                          ? 'Switched to Automatic Publishing.'
                          : 'Switched to Manual Admin Approval.'
                      );
                    } catch (err) {
                      notify('error', err instanceof Error ? err.message : 'Update failed.');
                    }
                  }}
                  className="h-4 w-4 accent-amber-500"
                />
              </label>

              <div className="rounded-xl border border-zinc-200 dark:border-white/10 p-4 space-y-1">
                <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-500" />
                  Last Successful Update
                </p>
                <p className="font-mono-tabular text-xs font-semibold text-zinc-950 dark:text-white">
                  {adminNewsState?.config.lastSuccessfulUpdate
                    ? new Date(adminNewsState.config.lastSuccessfulUpdate).toLocaleString()
                    : 'Pending initial fetch'}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-white/10 p-4 space-y-1">
                <p className="text-[11px] text-zinc-500">Collected Official Articles</p>
                <p className="font-mono-tabular text-xl font-bold text-zinc-950 dark:text-white">
                  {adminNewsState?.articles.length ?? 0}
                </p>
              </div>
            </div>

            {/* System Errors Alert Box */}
            {adminNewsState?.config.lastError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3 text-xs text-red-700 dark:text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">System Fetching Warning / Error</p>
                  <p>{adminNewsState.config.lastError}</p>
                </div>
              </div>
            )}

            {/* Collected Articles Moderation Queue */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-base font-bold text-zinc-950 dark:text-white">
                  Collected Official Articles ({adminNewsState?.articles.length ?? 0})
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {(['all', 'pending', 'approved', 'rejected'] as const).map((statusKey) => (
                    <button
                      key={statusKey}
                      type="button"
                      onClick={() => setAutoNewsFilter(statusKey)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize cursor-pointer ${
                        autoNewsFilter === statusKey
                          ? 'bg-zinc-950 dark:bg-amber-500 text-white dark:text-zinc-950'
                          : 'border border-zinc-300 dark:border-white/10 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {statusKey}
                    </button>
                  ))}
                </div>
              </div>

              {editingAutoArticle && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      Edit Automated Summary &amp; Category
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditingAutoArticle(null)}
                      className="text-xs text-zinc-500 hover:underline cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editingAutoArticle.title}
                    onChange={(e) =>
                      setEditingAutoArticle({ ...editingAutoArticle, title: e.target.value })
                    }
                    className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={editingAutoArticle.category}
                      onChange={(e) =>
                        setEditingAutoArticle({
                          ...editingAutoArticle,
                          category: e.target.value as NewsCategory,
                        })
                      }
                      className="rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                    >
                      {NEWS_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingAutoArticle.featured}
                        onChange={(e) =>
                          setEditingAutoArticle({
                            ...editingAutoArticle,
                            featured: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-amber-500"
                      />
                      Feature Lead Article
                    </label>
                  </div>
                  <textarea
                    rows={3}
                    value={editingAutoArticle.excerpt}
                    onChange={(e) =>
                      setEditingAutoArticle({ ...editingAutoArticle, excerpt: e.target.value })
                    }
                    className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await moderateAutoNewsArticle({
                        id: editingAutoArticle.id,
                        action: 'edit',
                        title: editingAutoArticle.title,
                        excerpt: editingAutoArticle.excerpt,
                        category: editingAutoArticle.category,
                        featured: editingAutoArticle.featured,
                      });
                      setEditingAutoArticle(null);
                      notify('success', 'Official article summary updated.');
                    }}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 cursor-pointer"
                  >
                    Save Summary Changes
                  </button>
                </div>
              )}

              {(!adminNewsState ||
                adminNewsState.articles.filter(
                  (a) =>
                    autoNewsFilter === 'all' ||
                    (a.approval_status || 'approved') === autoNewsFilter
                ).length === 0) ? (
                <p className="text-xs text-zinc-500 py-4 border-y border-zinc-200 dark:border-white/10">
                  No collected GMA Network or ABS-CBN articles match this filter yet. Click &ldquo;Manually Refresh News&rdquo; to check publisher feeds immediately.
                </p>
              ) : (
                <div className="divide-y divide-zinc-200 dark:divide-white/10 max-h-96 overflow-y-auto border-y border-zinc-200 dark:border-white/10">
                  {adminNewsState.articles
                    .filter(
                      (a) =>
                        autoNewsFilter === 'all' ||
                        (a.approval_status || 'approved') === autoNewsFilter
                    )
                    .map((art) => (
                      <div
                        key={art.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="font-bold uppercase text-amber-600 dark:text-amber-400">
                              {art.source_name || 'Official Source'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                              {art.category}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={`font-bold uppercase ${
                                art.approval_status === 'approved'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : art.approval_status === 'rejected'
                                  ? 'text-red-500'
                                  : 'text-amber-500'
                              }`}
                            >
                              {art.approval_status || 'approved'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular text-zinc-500">
                              {new Date(art.published_at || art.publishedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                            {art.title}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                            {art.excerpt}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {art.original_article_url && (
                            <a
                              href={art.original_article_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-white/15 px-2.5 py-1.5 text-[11px] font-medium hover:border-amber-500"
                            >
                              Source
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {art.approval_status !== 'approved' && (
                            <button
                              type="button"
                              onClick={async () => {
                                await moderateAutoNewsArticle({ id: art.id, action: 'approve' });
                                notify('success', 'Article approved and published.');
                              }}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {art.approval_status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={async () => {
                                await moderateAutoNewsArticle({ id: art.id, action: 'reject' });
                                notify('success', 'Article rejected.');
                              }}
                              className="rounded-lg border border-amber-500/40 px-2.5 py-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                            >
                              Reject
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setEditingAutoArticle({
                                id: art.id,
                                title: art.title,
                                excerpt: art.excerpt,
                                category: art.category,
                                featured: art.featured,
                              })
                            }
                            className="rounded-lg border border-zinc-300 dark:border-white/15 px-2.5 py-1.5 text-[11px] font-medium cursor-pointer"
                          >
                            Edit Summary
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                label: `Delete collected article "${art.title}"?`,
                                onConfirm: async () => {
                                  await moderateAutoNewsArticle({ id: art.id, action: 'delete' });
                                  notify('success', 'Collected article deleted.');
                                },
                              })
                            }
                            className="rounded-lg border border-red-500/30 p-1.5 text-red-500 hover:bg-red-500/10 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Fetching History Log */}
            <div className="space-y-3">
              <h3 className="font-display text-base font-bold text-zinc-950 dark:text-white">
                Fetching History ({adminNewsState?.logs.length ?? 0} runs)
              </h3>
              {(!adminNewsState || adminNewsState.logs.length === 0) ? (
                <p className="text-xs text-zinc-500">No fetch runs logged yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-500">
                        <th className="py-2.5 px-3 font-medium">Time</th>
                        <th className="py-2.5 px-3 font-medium">Trigger</th>
                        <th className="py-2.5 px-3 font-medium">Status</th>
                        <th className="py-2.5 px-3 font-medium text-right">Matched</th>
                        <th className="py-2.5 px-3 font-medium text-right">New</th>
                        <th className="py-2.5 px-3 font-medium text-right">Duplicates</th>
                        <th className="py-2.5 px-3 font-medium">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-white/10">
                      {adminNewsState.logs.slice(0, 10).map((log) => (
                        <tr key={log.id}>
                          <td className="py-2 px-3 font-mono-tabular text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 capitalize">{log.trigger}</td>
                          <td className="py-2 px-3 font-bold uppercase">
                            <span
                              className={
                                log.status === 'success'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : log.status === 'partial'
                                  ? 'text-amber-500'
                                  : 'text-red-500'
                              }
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono-tabular">
                            {log.discoveredCount}
                          </td>
                          <td className="py-2 px-3 text-right font-mono-tabular font-bold text-amber-600 dark:text-amber-400">
                            {log.newArticlesAdded}
                          </td>
                          <td className="py-2 px-3 text-right font-mono-tabular">
                            {log.duplicatesSkipped}
                          </td>
                          <td className="py-2 px-3 text-red-500 max-w-xs truncate">
                            {log.errors.length > 0 ? log.errors.join(' | ') : 'None'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Manual Editorial / Reference News Articles */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <form
              onSubmit={handleArticleSubmit}
              className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
                  {articleForm.isNew ? 'Publish Manual Dispatch' : 'Edit News Article'}
                </h2>
                {!articleForm.isNew && (
                  <button
                    type="button"
                    onClick={() =>
                      setArticleForm({
                        id: '',
                        isNew: true,
                        title: '',
                        category: 'Latest News',
                        excerpt: '',
                        content: '',
                        imageUrl: '',
                        authorName: 'PINOY BIG BROTHER 3.0 Editorial',
                        featured: false,
                        publishedAt: new Date().toISOString().slice(0, 16),
                      })
                    }
                    className="text-xs font-semibold text-amber-500 hover:underline cursor-pointer"
                  >
                    New Article
                  </button>
                )}
              </div>

              <input
                type="text"
                required
                value={articleForm.title}
                onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                placeholder="Article headline"
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={articleForm.category}
                  onChange={(e) =>
                    setArticleForm({ ...articleForm, category: e.target.value as NewsCategory })
                  }
                  className="rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                >
                  {NEWS_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={articleForm.authorName}
                  onChange={(e) => setArticleForm({ ...articleForm, authorName: e.target.value })}
                  placeholder="Author name"
                  className="rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>

              <textarea
                rows={2}
                required
                value={articleForm.excerpt}
                onChange={(e) => setArticleForm({ ...articleForm, excerpt: e.target.value })}
                placeholder="Short summary excerpt"
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
              />

              <textarea
                rows={5}
                required
                value={articleForm.content}
                onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                placeholder="Full article body (separate paragraphs with blank lines)"
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
              />

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-white/15 px-3 py-2 text-xs font-medium cursor-pointer shrink-0">
                  <Upload className="h-3.5 w-3.5" />
                  Cover Image
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = await compressImageFile(f, 900, 0.78);
                      setArticleForm({ ...articleForm, imageUrl: url });
                    }}
                  />
                </label>
                <input
                  type="text"
                  value={articleForm.imageUrl}
                  onChange={(e) => setArticleForm({ ...articleForm, imageUrl: e.target.value })}
                  placeholder="Optional cover image URL"
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-950 dark:text-white"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={articleForm.featured}
                  onChange={(e) => setArticleForm({ ...articleForm, featured: e.target.checked })}
                  className="h-4 w-4 accent-amber-500"
                />
                Feature Lead Article
              </label>

              <button
                type="submit"
                className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 cursor-pointer"
              >
                {articleForm.isNew ? 'Publish Article' : 'Save Article'}
              </button>
            </form>

            <div className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
                Published News ({newsArticles.length})
              </h2>
              <div className="divide-y divide-zinc-200 dark:divide-white/10">
                {newsArticles.map((art: NewsArticle) => (
                  <div key={art.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {art.category} · {new Date(art.publishedAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                        {art.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setArticleForm({
                            id: art.id,
                            isNew: false,
                            title: art.title,
                            category: art.category,
                            excerpt: art.excerpt,
                            content: art.content,
                            imageUrl: art.imageUrl,
                            authorName: art.authorName,
                            featured: art.featured,
                            publishedAt: new Date(art.publishedAt).toISOString().slice(0, 16),
                          })
                        }
                        className="rounded-lg border border-zinc-300 dark:border-white/15 px-3 py-1.5 text-xs font-medium cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({
                            label: `Delete article "${art.title}"?`,
                            onConfirm: async () => {
                              await deleteArticle(art.id);
                              notify('success', 'Article deleted.');
                            },
                          })
                        }
                        className="rounded-lg border border-red-500/30 p-1.5 text-red-500 hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Announcements & Homepage Hero Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-zinc-200 dark:border-white/10 pt-8">
            <form
              onSubmit={handleAnnouncementSubmit}
              className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4"
            >
              <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
                Publish House Announcement
              </h2>
              <input
                type="text"
                required
                value={annForm.title}
                onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                placeholder="Bulletin title"
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
              />
              <textarea
                rows={2}
                required
                value={annForm.message}
                onChange={(e) => setAnnForm({ ...annForm, message: e.target.value })}
                placeholder="Announcement message"
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
              />
              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 cursor-pointer"
              >
                Publish Announcement
              </button>

              <div className="divide-y divide-zinc-200 dark:divide-white/10 pt-2">
                {announcements.map((ann: Announcement) => (
                  <div key={ann.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-950 dark:text-white truncate">
                        {ann.title}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">{ann.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDelete({
                          label: `Delete announcement "${ann.title}"?`,
                          onConfirm: async () => {
                            await deleteAnnouncement(ann.id);
                            notify('success', 'Announcement deleted.');
                          },
                        })
                      }
                      className="text-red-500 p-1 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </form>

            <form
              onSubmit={handleSaveSettings}
              className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4"
            >
              <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
                Homepage Hero Banner Editor
              </h2>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Hero Welcome Headline
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.heroWelcomeTitle}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, heroWelcomeTitle: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Hero Platform Description
                </label>
                <textarea
                  rows={3}
                  value={settingsForm.heroDescription}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, heroDescription: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-white/15 px-3 py-2 text-xs font-medium cursor-pointer shrink-0">
                  <Upload className="h-3.5 w-3.5" />
                  Banner Image
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = await compressImageFile(f, 1000, 0.78);
                      setSettingsForm({ ...settingsForm, heroBannerUrl: url });
                    }}
                  />
                </label>
                <input
                  type="text"
                  value={settingsForm.heroBannerUrl}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, heroBannerUrl: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-950 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 cursor-pointer"
              >
                Save Hero Banner
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. WEBSITE SETTINGS & USERS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleSaveSettings}
            className="lg:col-span-6 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-5"
          >
            <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
              Maintenance Mode &amp; Site Configuration
            </h2>

            <label className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 dark:border-white/10 p-4 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                  Maintenance Mode
                </p>
                <p className="text-xs text-zinc-500">
                  Hides public pages and displays WE'LL BE BACK SOON!
                </p>
              </div>
              <input
                type="checkbox"
                checked={settingsForm.maintenanceMode}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, maintenanceMode: e.target.checked })
                }
                className="h-5 w-5 accent-red-600"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Maintenance Headline
                </label>
                <input
                  type="text"
                  value={settingsForm.maintenanceMessage}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, maintenanceMessage: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Estimated Return Time
                </label>
                <input
                  type="text"
                  value={settingsForm.maintenanceReturnTime}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, maintenanceReturnTime: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-zinc-200 dark:border-white/10 pt-4">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.announcementBannerEnabled}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      announcementBannerEnabled: e.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-amber-500"
                />
                Show Top Announcement Strip
              </label>
              <input
                type="text"
                value={settingsForm.announcementBannerText}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, announcementBannerText: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-zinc-200 dark:border-white/10 pt-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Site Tagline
                </label>
                <input
                  type="text"
                  value={settingsForm.tagline}
                  onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={settingsForm.contactEmail}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, contactEmail: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 cursor-pointer"
            >
              Save Website Settings
            </button>
          </form>

          <div className="lg:col-span-6 space-y-6">
            {/* User Accounts & RBAC */}
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
                Registered Accounts ({allUsers.length})
              </h2>
              <div className="divide-y divide-zinc-200 dark:divide-white/10 max-h-72 overflow-y-auto">
                {allUsers.map((u) => {
                  const isSelf = u.uid === user.uid;
                  return (
                    <div key={u.uid} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                          {u.displayName}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                      </div>
                      <select
                        disabled={isSelf}
                        value={u.role}
                        onChange={async (e) => {
                          const nextRole = e.target.value as 'user' | 'admin';
                          await updateUserRole(u.uid, u.email, nextRole);
                          notify('success', `Updated ${u.email} role to ${nextRole}.`);
                        }}
                        className="rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium disabled:opacity-50"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contact Inquiries */}
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
                  Contact Inquiries ({inquiries.length})
                </h2>
                <button
                  type="button"
                  onClick={refreshInquiries}
                  className="text-xs font-semibold text-amber-500 hover:underline cursor-pointer"
                >
                  Refresh
                </button>
              </div>
              {inquiries.length === 0 ? (
                <p className="text-xs text-zinc-500">No contact submissions received yet.</p>
              ) : (
                <div className="divide-y divide-zinc-200 dark:divide-white/10 max-h-60 overflow-y-auto">
                  {inquiries.map((inq) => (
                    <div key={inq.id} className="py-3 space-y-1">
                      <p className="text-xs font-semibold text-zinc-950 dark:text-white">
                        {inq.subject} · <span className="text-zinc-500">{inq.email}</span>
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">{inq.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
              Confirm Removal
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{confirmDelete.label}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-zinc-300 dark:border-white/15 px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await confirmDelete.onConfirm();
                  setConfirmDelete(null);
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
