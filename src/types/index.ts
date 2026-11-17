export type HousemateStatus = 'active' | 'nominated' | 'evicted' | 'winner' | 'guest';
export type HousemateNetwork = 'Kapamilya' | 'Kapuso' | 'House Guest' | 'Evicted';

export interface Housemate {
  id: string;
  slug: string;
  fullName: string;
  nickname: string;
  age?: number;
  hometown: string;
  tagline: string;
  biography: string;
  status: HousemateStatus;
  network?: HousemateNetwork;
  isImmune?: boolean;
  nominationPoints?: number;
  avatarColor: string;
  photoUrl: string;
  featured: boolean;
  enteredDay: number;
  orderIndex: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type LivestreamStatus = 'live' | 'offline' | 'scheduled' | 'unavailable';
export type LivestreamProvider = 'youtube' | 'iframe' | 'external' | 'none';

export interface LivestreamFeed {
  id: string;
  title: string;
  cameraLabel: string;
  streamUrl: string;
  providerType: LivestreamProvider;
  status: LivestreamStatus;
  isPrimary: boolean;
  coverImageUrl?: string;
  scheduleSummary: string;
  description: string;
  orderIndex: number;
  cropZoom?: number;
  cropX?: number;
  cropY?: number;
  cropTop?: number;
  cropBottom?: number;
  cropLeft?: number;
  cropRight?: number;
  updatedAt?: unknown;
}

export type ScheduleCategory = 'livestream' | 'challenge' | 'nomination' | 'eviction' | 'special';

export interface ScheduleItem {
  id: string;
  title: string;
  category: ScheduleCategory;
  startTime: string;
  endTime: string;
  targetDateIso?: string;
  cameraLabel: string;
  description: string;
  isUpcoming: boolean;
  updatedAt?: unknown;
}

export type PollStatus = 'open' | 'closed' | 'scheduled';

export interface FanPoll {
  id: string;
  title: string;
  description: string;
  instructions: string;
  status: PollStatus;
  startDate: string;
  endDate: string;
  housemateIds: string[];
  totalVotes: number;
  optionCounts: Record<string, number>;
  isFeatured: boolean;
  lastVoteId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FanPollVote {
  id: string;
  pollId: string;
  userId: string;
  housemateId: string;
  createdAt?: unknown;
}

export const NEWS_CATEGORIES = [
  'Latest News',
  'Housemate Updates',
  'Nomination Results',
  'Eviction Updates',
  'Voting Updates',
  'Challenges and Tasks',
  'House Activities',
  'Official Announcements',
  'Special Episodes',
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export type NewsSourceName = 'GMA Network' | 'ABS-CBN' | 'PINOY BIG BROTHER 3.0' | 'PBB ALL ACCESS';
export type NewsApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: NewsCategory;
  imageUrl: string;
  featured_image?: string;
  original_article_url?: string;
  source_name?: NewsSourceName;
  authorName: string;
  featured: boolean;
  publishedAt: string;
  published_at?: string;
  fetched_at?: string;
  approval_status?: NewsApprovalStatus;
  isAutoCollected?: boolean;
  created_at?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NewsFetchConfig {
  enabled: boolean;
  autoPublish: boolean;
  intervalMinutes: number;
  lastSuccessfulUpdate: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  nextScheduledAt: string | null;
}

export interface NewsFetchLog {
  id: string;
  timestamp: string;
  trigger: 'scheduler' | 'manual' | 'startup';
  status: 'success' | 'partial' | 'error';
  sourcesChecked: string[];
  discoveredCount: number;
  newArticlesAdded: number;
  duplicatesSkipped: number;
  errors: string[];
}

export interface NewsAdminState {
  config: NewsFetchConfig;
  articles: NewsArticle[];
  logs: NewsFetchLog[];
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'normal' | 'urgent';
  active: boolean;
  linkUrl: string;
  createdAt?: unknown;
}

export interface SocialLinks {
  facebook: string;
  x: string;
  instagram: string;
  youtube: string;
  tiktok: string;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  heroWelcomeTitle: string;
  heroDescription: string;
  heroBannerUrl: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceReturnTime: string;
  announcementBannerEnabled: boolean;
  announcementBannerText: string;
  contactEmail: string;
  socialLinks: SocialLinks;
  seeded: boolean;
  updatedAt?: unknown;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  bio?: string;
  favoriteHousemateId?: string;
  role: 'user' | 'admin';
  themePreference: 'dark' | 'light';
  notificationsEnabled: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdminRecord {
  uid: string;
  email: string;
  grantedBy: string;
  createdAt?: unknown;
}

export interface ActivityLog {
  id: string;
  action: string;
  actorEmail: string;
  targetType: string;
  details: string;
  createdAt?: unknown;
}

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  submittedAt: string;
}

export interface LiveChatMessage {
  id: string;
  feedId: string;
  userId: string;
  displayName: string;
  role: 'user' | 'admin';
  message: string;
  createdAt?: unknown;
}

export interface RankingCategory {
  id: string;
  title: string;
  shortLabel: string;
  subtitle: string;
  seasonHeader: string;
  actionLabel: string;
  valueColumnLabel: string;
  isOpen: boolean;
  housemateIds: string[];
  counts: Record<string, number>;
  totalVotes: number;
  orderIndex: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RankingVote {
  id: string;
  categoryId: string;
  userId: string;
  housemateId: string;
  createdAt?: unknown;
}
