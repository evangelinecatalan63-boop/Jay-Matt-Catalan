import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from './src/lib/firebase-admin.ts';
import {
  getAdminNewsState,
  getPublicNewsFeed,
  moderateCollectedNewsArticle,
  runNewsFetchCycle,
  startNewsScheduler,
  updateNewsFetchConfig,
} from './src/server/newsFetcher.ts';
import { NEWS_CATEGORIES } from './src/types/index.ts';
import type { NewsCategory } from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

const BOOTSTRAP_ADMIN_EMAIL = 'mjay63510@gmail.com';

// Server-side visitor tracking & anti-spam state
const seenVisitorIds = new Set<string>();
let totalVisitorHits = 14820;

const voteCooldownByUid = new Map<string, number>();
const samplePollVotesByPollUser = new Map<string, string>(); // `${pollId}_${uid}` -> housemateId
const samplePollCounts = new Map<string, Record<string, number>>([
  [
    'poll-collab3-nom2-save',
    {
      'hm-primo': 620,
      'hm-raheel': 485,
      'hm-bela': 390,
      'hm-cianne': 445,
      'hm-nathan': 285,
      'hm-nicole': 255,
    },
  ],
]);

const sampleRankingVotesByCatUser = new Map<string, string>();
const sampleRankingCounts = new Map<string, Record<string, number>>([
  [
    'cat-nominate',
    {
      'hm-primo': 1940,
      'hm-raheel': 1520,
      'hm-bela': 1180,
      'hm-cianne': 920,
      'hm-nathan': 840,
      'hm-nicole': 790,
      'hm-daniela': 610,
      'hm-anthony': 540,
      'hm-ronnie': 480,
      'hm-allen': 430,
      'hm-shea': 390,
      'hm-lorelaine': 355,
      'hm-mikee': 310,
      'hm-winwyn': 285,
      'hm-gehlee': 240,
      'hm-jeo': 190,
      'hm-lans': 175,
    },
  ],
  [
    'cat-save',
    {
      'hm-primo': 3410,
      'hm-cianne': 2895,
      'hm-raheel': 2540,
      'hm-bela': 2120,
      'hm-nathan': 1680,
      'hm-nicole': 1510,
    },
  ],
  [
    'cat-support',
    {
      'hm-jeo': 4820,
      'hm-lans': 4410,
      'hm-primo': 3890,
      'hm-gehlee': 3560,
      'hm-anthony': 3125,
      'hm-mikee': 2840,
      'hm-cianne': 2590,
      'hm-nathan': 2210,
      'hm-raheel': 1980,
      'hm-bela': 1740,
      'hm-winwyn': 1610,
      'hm-allen': 1490,
      'hm-daniela': 1340,
      'hm-shea': 1215,
      'hm-nicole': 1080,
      'hm-lorelaine': 940,
      'hm-ronnie': 860,
    },
  ],
]);

interface StoredInquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  submittedAt: string;
}

const contactInquiries: StoredInquiry[] = [];
const contactRateLimit = new Map<string, number>();

const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing authentication token.' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
  }
};

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'pinoy-big-brother-3.0', timestamp: new Date().toISOString() });
});

// Visitor tracking with session deduplication
app.post('/api/metrics/visit', (req, res) => {
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.slice(0, 64) : '';
  const ip = req.ip || 'unknown';
  const visitorKey = sessionId || ip;

  if (!seenVisitorIds.has(visitorKey)) {
    seenVisitorIds.add(visitorKey);
    totalVisitorHits += 1;
  }

  res.json({
    totalVisitors: totalVisitorHits,
    activeSessions: Math.max(1, seenVisitorIds.size),
  });
});

app.get('/api/metrics/summary', (_req, res) => {
  const sampleVotesSummary: Record<string, Record<string, number>> = {};
  for (const [pollId, counts] of samplePollCounts.entries()) {
    sampleVotesSummary[pollId] = counts;
  }
  const sampleRankingSummary: Record<string, Record<string, number>> = {};
  for (const [catId, counts] of sampleRankingCounts.entries()) {
    sampleRankingSummary[catId] = counts;
  }
  res.json({
    totalVisitors: totalVisitorHits,
    activeSessions: Math.max(1, seenVisitorIds.size),
    samplePollCounts: sampleVotesSummary,
    sampleRankingCounts: sampleRankingSummary,
  });
});

// Server-side vote validation & anti-spam check
app.post('/api/vote/validate', requireAuth, (req: AuthRequest, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (!user.email_verified) {
    res.status(403).json({
      error: 'Please verify your email address before submitting a fan poll vote.',
    });
    return;
  }

  const { pollId, housemateId, isPersistedInDb } = req.body ?? {};
  const idRegex = /^[a-zA-Z0-9_-]{1,128}$/;

  if (typeof pollId !== 'string' || !idRegex.test(pollId)) {
    res.status(400).json({ error: 'Invalid poll identifier.' });
    return;
  }
  if (typeof housemateId !== 'string' || !idRegex.test(housemateId)) {
    res.status(400).json({ error: 'Invalid housemate identifier.' });
    return;
  }

  // Anti-spam cooldown: max 1 vote validation attempt every 4 seconds per account
  const now = Date.now();
  const lastVoteAttempt = voteCooldownByUid.get(user.uid) || 0;
  if (now - lastVoteAttempt < 4000) {
    res.status(429).json({
      error: 'Please wait a few seconds before submitting another vote.',
    });
    return;
  }
  voteCooldownByUid.set(user.uid, now);

  // If the poll has not yet been seeded into Firestore, record server-validated sample poll vote
  if (isPersistedInDb === false) {
    const compositeKey = `${pollId}_${user.uid}`;
    if (samplePollVotesByPollUser.has(compositeKey)) {
      res.status(409).json({
        error: 'You have already submitted a vote for this fan poll.',
      });
      return;
    }
    samplePollVotesByPollUser.set(compositeKey, housemateId);
    const currentCounts = samplePollCounts.get(pollId) || {};
    currentCounts[housemateId] = (currentCounts[housemateId] || 0) + 1;
    samplePollCounts.set(pollId, currentCounts);

    res.json({
      validated: true,
      mode: 'sample',
      uid: user.uid,
      updatedCounts: currentCounts,
    });
    return;
  }

  res.json({
    validated: true,
    mode: 'firestore',
    uid: user.uid,
  });
});

// Server-side ranking vote validation & anti-spam check
app.post('/api/ranking/validate', requireAuth, (req: AuthRequest, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (!user.email_verified) {
    res.status(403).json({
      error: 'Please verify your email address before voting in rankings.',
    });
    return;
  }

  const { categoryId, housemateId, isPersistedInDb } = req.body ?? {};
  const idRegex = /^[a-zA-Z0-9_-]{1,128}$/;

  if (typeof categoryId !== 'string' || !idRegex.test(categoryId)) {
    res.status(400).json({ error: 'Invalid ranking category identifier.' });
    return;
  }
  if (typeof housemateId !== 'string' || !idRegex.test(housemateId)) {
    res.status(400).json({ error: 'Invalid housemate identifier.' });
    return;
  }

  const now = Date.now();
  const lastVoteAttempt = voteCooldownByUid.get(user.uid) || 0;
  if (now - lastVoteAttempt < 2500) {
    res.status(429).json({
      error: 'Please wait a couple seconds before submitting another vote.',
    });
    return;
  }
  voteCooldownByUid.set(user.uid, now);

  if (isPersistedInDb === false) {
    const compositeKey = `${categoryId}_${user.uid}`;
    if (sampleRankingVotesByCatUser.has(compositeKey)) {
      res.status(409).json({
        error: 'You have already voted in this ranking category.',
      });
      return;
    }
    sampleRankingVotesByCatUser.set(compositeKey, housemateId);
    const currentCounts = sampleRankingCounts.get(categoryId) || {};
    currentCounts[housemateId] = (currentCounts[housemateId] || 0) + 1;
    sampleRankingCounts.set(categoryId, currentCounts);

    res.json({
      validated: true,
      mode: 'sample',
      uid: user.uid,
      updatedCounts: currentCounts,
    });
    return;
  }

  res.json({
    validated: true,
    mode: 'firestore',
    uid: user.uid,
  });
});

// Contact form endpoint with server-side validation & rate limiting
app.post('/api/contact', (req, res) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const lastSubmit = contactRateLimit.get(ip) || 0;
  if (now - lastSubmit < 15000) {
    res.status(429).json({ error: 'Please wait 15 seconds before sending another message.' });
    return;
  }

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

  if (name.length < 2 || name.length > 100) {
    res.status(400).json({ error: 'Please enter a valid name (2–100 characters).' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) {
    res.status(400).json({ error: 'Please provide a valid email address.' });
    return;
  }
  if (subject.length < 3 || subject.length > 140) {
    res.status(400).json({ error: 'Please enter a subject (3–140 characters).' });
    return;
  }
  if (message.length < 10 || message.length > 2000) {
    res.status(400).json({ error: 'Message must be between 10 and 2000 characters.' });
    return;
  }

  contactRateLimit.set(ip, now);

  const inquiry: StoredInquiry = {
    id: `inq-${Date.now().toString(36)}`,
    name,
    email,
    subject,
    message,
    submittedAt: new Date().toISOString(),
  };

  contactInquiries.unshift(inquiry);
  if (contactInquiries.length > 100) {
    contactInquiries.pop();
  }

  res.status(201).json({
    success: true,
    referenceId: inquiry.id,
    submittedAt: inquiry.submittedAt,
  });
});

// Admin guard helper
const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const email = req.user?.email || '';
  const isVerified = req.user?.email_verified === true;
  if (!isVerified || !email) {
    res.status(403).json({ error: 'Verified account required.' });
    return;
  }
  const adminClaimHeader = req.headers['x-pbb-admin-verified'];
  if (email !== BOOTSTRAP_ADMIN_EMAIL && adminClaimHeader !== req.user?.uid) {
    res.status(403).json({ error: 'Administrator privileges required.' });
    return;
  }
  next();
};

// Admin-protected endpoint for contact inquiries
app.get('/api/admin/inquiries', requireAuth, requireAdmin, (_req: AuthRequest, res) => {
  res.json({ inquiries: contactInquiries });
});

// Public Automated News & Updates Feed (Official GMA Network & ABS-CBN sources only)
app.get('/api/news/feed', (_req, res) => {
  res.json(getPublicNewsFeed());
});

// Admin Automated News Endpoints
app.get('/api/admin/news/status', requireAuth, requireAdmin, (_req, res) => {
  res.json(getAdminNewsState());
});

app.post('/api/admin/news/config', requireAuth, requireAdmin, (req, res) => {
  const { enabled, autoPublish } = req.body ?? {};
  const updatedConfig = updateNewsFetchConfig({
    enabled: typeof enabled === 'boolean' ? enabled : undefined,
    autoPublish: typeof autoPublish === 'boolean' ? autoPublish : undefined,
  });
  res.json({ config: updatedConfig });
});

app.post('/api/admin/news/refresh', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const log = await runNewsFetchCycle('manual');
    res.json({ log, state: getAdminNewsState() });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Manual news refresh failed.',
    });
  }
});

app.post('/api/admin/news/moderate', requireAuth, requireAdmin, (req, res) => {
  const { id, action, title, excerpt, category, featured } = req.body ?? {};
  if (typeof id !== 'string' || !id) {
    res.status(400).json({ error: 'Article id is required.' });
    return;
  }
  if (!['approve', 'reject', 'edit', 'delete'].includes(action)) {
    res.status(400).json({ error: 'Invalid moderation action.' });
    return;
  }
  const safeCategory: NewsCategory | undefined =
    typeof category === 'string' &&
    (NEWS_CATEGORIES as readonly string[]).includes(category)
      ? (category as NewsCategory)
      : undefined;

  try {
    const state = moderateCollectedNewsArticle({
      id,
      action,
      title: typeof title === 'string' ? title : undefined,
      excerpt: typeof excerpt === 'string' ? excerpt : undefined,
      category: safeCategory,
      featured: typeof featured === 'boolean' ? featured : undefined,
    });
    res.json({ state });
  } catch (err) {
    res.status(404).json({
      error: err instanceof Error ? err.message : 'Unable to moderate article.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PINOY BIG BROTHER 3.0 server running on http://0.0.0.0:${PORT}`);
    startNewsScheduler();
  });
}

startServer().catch((err) => {
  console.error('Failed to start PINOY BIG BROTHER 3.0 server:', err);
  process.exit(1);
});
