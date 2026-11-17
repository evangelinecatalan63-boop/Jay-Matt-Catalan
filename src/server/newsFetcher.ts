import fs from 'fs';
import path from 'path';
import type {
  NewsAdminState,
  NewsApprovalStatus,
  NewsArticle,
  NewsCategory,
  NewsFetchConfig,
  NewsFetchLog,
  NewsSourceName,
} from '../types/index.ts';

const STORE_FILE_PATH = path.resolve(process.cwd(), '.pbb-news-cache.json');
const FETCH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const ALLOWED_DOMAIN_SUFFIXES = ['gmanetwork.com', 'abs-cbn.com'];

const COLLAB3_HOUSEMATE_KEYWORDS = [
  'cianne dominguez',
  'gehlee dangca',
  'jeo ong',
  'nathan garcia',
  'primo alterado',
  'shea valerio',
  'daniela stranner',
  'lorelaine sanosa',
  'lorelaine sañosa',
  'bela arcal',
  'anthony constantino',
  'lans nagal',
  'mikee quintos',
  'nicole fortuna',
  'raheel bhyria',
  'winwyn marquez',
  'allen ansay',
  'ronnie pasamba',
  'robbie jaworski',
  'calix esguerra',
  'ethan benares',
];

interface PersistedNewsStore {
  config: NewsFetchConfig;
  articles: NewsArticle[];
  logs: NewsFetchLog[];
}

function defaultStore(): PersistedNewsStore {
  return {
    config: {
      enabled: true,
      autoPublish: true,
      intervalMinutes: 30,
      lastSuccessfulUpdate: null,
      lastAttemptAt: null,
      lastError: null,
      nextScheduledAt: new Date(Date.now() + FETCH_INTERVAL_MS).toISOString(),
    },
    articles: [],
    logs: [],
  };
}

let memoryStore: PersistedNewsStore = loadStoreFromDisk();
let activeFetchPromise: Promise<NewsFetchLog> | null = null;
let schedulerHandle: ReturnType<typeof setInterval> | null = null;

function loadStoreFromDisk(): PersistedNewsStore {
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PersistedNewsStore>;
      const base = defaultStore();
      return {
        config: { ...base.config, ...(parsed.config || {}), intervalMinutes: 30 },
        articles: Array.isArray(parsed.articles) ? parsed.articles : [],
        logs: Array.isArray(parsed.logs) ? parsed.logs.slice(0, 50) : [],
      };
    }
  } catch (err) {
    console.warn('Could not read persisted news cache, starting clean:', err);
  }
  return defaultStore();
}

function saveStoreToDisk() {
  try {
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(memoryStore, null, 2), 'utf8');
  } catch (err) {
    console.warn('Unable to persist news cache to disk:', err);
  }
}

export function isTrustedSourceUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_DOMAIN_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    );
  } catch {
    return false;
  }
}

export function normalizeCanonicalUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl.trim());
    u.hash = '';
    const dropParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'si'];
    dropParams.forEach((p) => u.searchParams.delete(p));
    let pathname = u.pathname.replace(/\/+$/, '');
    if (!pathname) pathname = '/';
    return `${u.protocol}//${u.hostname.toLowerCase()}${pathname}${u.search}`;
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;|&apos;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugifyTitle(title: string, fallbackId: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return base || fallbackId;
}

function isPbbCollab3Relevant(title: string, url: string, description = '', tags = ''): boolean {
  const haystack = `${title} ${url} ${description} ${tags}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const explicitPbb =
    haystack.includes('pbb collab 3') ||
    haystack.includes('pbb-collab-3') ||
    haystack.includes('collab 3.0') ||
    haystack.includes('pinoy big brother: collab') ||
    haystack.includes('pinoy big brother collab') ||
    haystack.includes('pinoy-big-brother') ||
    haystack.includes('bahay ni kuya') ||
    /\bpbb\b/.test(haystack);

  if (!explicitPbb) {
    // Also accept if multiple official Collab 3.0 housemates appear together in the same entertainment story
    const hmHits = COLLAB3_HOUSEMATE_KEYWORDS.filter((name) => haystack.includes(name));
    return hmHits.length >= 2 || (hmHits.length === 1 && haystack.includes('housemate'));
  }

  // Exclude unrelated earlier seasons explicitly labeled Collab 1 / Celebrity Collab Edition 1 / Gen 11 unless Collab 3 or a current housemate appears
  if (
    (haystack.includes('gen 11') || haystack.includes('gen11')) &&
    !haystack.includes('collab 3')
  ) {
    return false;
  }

  return true;
}

function categorizeArticle(title: string, excerpt: string, url: string): NewsCategory {
  const text = `${title} ${excerpt} ${url}`.toLowerCase();

  if (/\b(nominat|nominee|nominated|nomination points|ligtask|ligtas|immunity)\b/.test(text)) {
    return 'Nomination Results';
  }
  if (/\b(evict|evicted|eviction|evictee|pbb exit|exited)\b/.test(text)) {
    return 'Eviction Updates';
  }
  if (/\b(vote|voting|poll|save|botohan|maya)\b/.test(text)) {
    return 'Voting Updates';
  }
  if (/\b(task|challenge|weekly task|pagsubok|mission)\b/.test(text)) {
    return 'Challenges and Tasks';
  }
  if (/\b(kitchen|chore|activity area|singing|co-written|performed|birthday|bond|bonding)\b/.test(text)) {
    return 'House Activities';
  }
  if (/\b(announc|big brother announces|kuya warns|official statement|new housemates)\b/.test(text)) {
    return 'Official Announcements';
  }
  if (/\b(episode|primetime|livestream|house guest|special|premiere)\b/.test(text)) {
    return 'Special Episodes';
  }
  if (
    COLLAB3_HOUSEMATE_KEYWORDS.some((name) => text.includes(name)) ||
    /\b(housemate|ex-pbb|ex pbb)\b/.test(text)
  ) {
    return 'Housemate Updates';
  }
  return 'Latest News';
}

function buildExcerptSummary(rawSummary: string, title: string, sourceName: NewsSourceName): string {
  const clean = decodeHtmlEntities(rawSummary);
  if (clean && clean.length >= 24 && clean.toLowerCase() !== title.toLowerCase()) {
    return clean.length > 300 ? `${clean.slice(0, 297).trim()}...` : clean;
  }
  return `Official ${sourceName} summary coverage for Pinoy Big Brother: Collab 3.0. Click READ FULL ARTICLE to view the original report.`;
}

function buildSummaryAttributionBody(
  excerpt: string,
  sourceName: NewsSourceName,
  originalUrl: string
): string {
  return `${excerpt}\n\nSummary Note: This brief summary was automatically indexed from official publisher metadata on ${sourceName}. PINOY BIG BROTHER 3.0 does not reproduce copyrighted full-length articles — please use the READ FULL ARTICLE link to read the complete story directly on ${sourceName} (${originalUrl}).`;
}

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function getDisallowedPaths(origin: string): Promise<string[]> {
  try {
    const res = await fetchWithTimeout(`${origin}/robots.txt`, 6000);
    if (!res.ok) return [];
    const txt = await res.text();
    const lines = txt.split(/\r?\n/);
    let inWildcard = false;
    const disallows: string[] = [];
    for (const rawLine of lines) {
      const line = rawLine.split('#')[0].trim();
      if (!line) continue;
      if (/^user-agent\s*:/i.test(line)) {
        const ua = line.split(':')[1]?.trim() || '';
        inWildcard = ua === '*';
      } else if (inWildcard && /^disallow\s*:/i.test(line)) {
        const rule = line.slice(line.indexOf(':') + 1).trim();
        if (rule) disallows.push(rule);
      }
    }
    return disallows;
  } catch {
    return [];
  }
}

function isUrlAllowedByRobots(targetUrl: string, disallows: string[]): boolean {
  try {
    const u = new URL(targetUrl);
    const fullPath = `${u.pathname}${u.search}`;
    for (const rule of disallows) {
      if (rule === '/') return false;
      const escaped = rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      const regex = new RegExp(`^${escaped}`);
      if (regex.test(fullPath)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function extractMetaContent(html: string, key: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`, 'i'),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return decodeHtmlEntities(match[1]);
  }
  return '';
}

function extractPublishedDateFromHtml(html: string): string | null {
  const candidates = [
    extractMetaContent(html, 'article:published_time'),
    extractMetaContent(html, 'og:published_time'),
  ];
  const jsonLdDate = html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1];
  if (jsonLdDate) candidates.unshift(jsonLdDate);

  for (const candidate of candidates) {
    if (!candidate) continue;
    const d = new Date(candidate);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  return null;
}

interface CandidateArticle {
  title: string;
  originalUrl: string;
  excerpt: string;
  featuredImage: string;
  publishedAt: string | null;
  sourceName: NewsSourceName;
  authorName: string;
}

async function fetchGmaArticles(): Promise<{
  candidates: CandidateArticle[];
  errors: string[];
}> {
  const errors: string[] = [];
  const discoveredLinks = new Map<string, Partial<CandidateArticle>>();
  const disallows = await getDisallowedPaths('https://www.gmanetwork.com');

  // 1. Official GMA RSS feeds
  const rssUrls = [
    'https://data.gmanetwork.com/gno/rss/news/feed.xml',
    'https://data.gmanetwork.com/gno/rss/showbiz/feed.xml',
  ];

  for (const rssUrl of rssUrls) {
    try {
      const res = await fetchWithTimeout(rssUrl, 9000);
      if (!res.ok) {
        errors.push(`GMA RSS (${rssUrl}) returned HTTP ${res.status}`);
        continue;
      }
      const xml = await res.text();
      const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
      for (const itemXml of itemMatches) {
        const title = decodeHtmlEntities(
          itemXml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || ''
        );
        const link = decodeHtmlEntities(
          itemXml.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || ''
        );
        const desc = decodeHtmlEntities(
          itemXml.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || ''
        );
        const pubDateRaw = decodeHtmlEntities(
          itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || ''
        );
        const mediaImg =
          itemXml.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ||
          itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1] ||
          '';

        if (!link || !isTrustedSourceUrl(link)) continue;
        if (!isPbbCollab3Relevant(title, link, desc)) continue;
        const normalized = normalizeCanonicalUrl(link);
        const parsedDate = pubDateRaw ? new Date(pubDateRaw) : null;
        discoveredLinks.set(normalized, {
          title,
          originalUrl: link,
          excerpt: desc,
          featuredImage: mediaImg,
          publishedAt:
            parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
          sourceName: 'GMA Network',
          authorName: 'GMA Integrated News',
        });
      }
    } catch (err) {
      errors.push(`GMA RSS fetch failed (${rssUrl}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. Allowed GMA Entertainment Showbiz News section
  const gmaListingUrl = 'https://www.gmanetwork.com/entertainment/showbiznews/';
  if (isUrlAllowedByRobots(gmaListingUrl, disallows)) {
    try {
      const res = await fetchWithTimeout(gmaListingUrl, 9000);
      if (!res.ok) {
        errors.push(`GMA Entertainment listing returned HTTP ${res.status}`);
      } else {
        const html = await res.text();
        const linkMatches =
          html.match(
            /href=["'](https:\/\/www\.gmanetwork\.com\/entertainment\/showbiznews\/[^"'?#]+)["']/gi
          ) || [];

        const uniquePageUrls = new Set<string>();
        for (const attr of linkMatches) {
          const url = attr.replace(/^href=["']/i, '').replace(/["']$/, '');
          if (!isTrustedSourceUrl(url) || !isUrlAllowedByRobots(url, disallows)) continue;
          if (!isPbbCollab3Relevant('', url)) continue;
          uniquePageUrls.add(url);
        }

        // Fetch metadata from up to 12 matched PBB articles per cycle
        for (const pageUrl of Array.from(uniquePageUrls).slice(0, 12)) {
          const normalized = normalizeCanonicalUrl(pageUrl);
          if (discoveredLinks.has(normalized)) continue;
          try {
            const pageRes = await fetchWithTimeout(pageUrl, 8000);
            if (!pageRes.ok) continue;
            const pageHtml = await pageRes.text();
            const rawOgTitle =
              extractMetaContent(pageHtml, 'og:title') ||
              decodeHtmlEntities(pageHtml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
            const cleanTitle = rawOgTitle.replace(/\s*\|\s*GMA Entertainment.*$/i, '').trim();
            const ogDesc =
              extractMetaContent(pageHtml, 'og:description') ||
              extractMetaContent(pageHtml, 'description');
            const ogImage = extractMetaContent(pageHtml, 'og:image');
            const canonicalUrl = extractMetaContent(pageHtml, 'og:url') || pageUrl;
            const publishedAt = extractPublishedDateFromHtml(pageHtml);

            if (!cleanTitle || !publishedAt) continue;
            if (!isPbbCollab3Relevant(cleanTitle, canonicalUrl, ogDesc)) continue;

            discoveredLinks.set(normalizeCanonicalUrl(canonicalUrl), {
              title: cleanTitle,
              originalUrl: canonicalUrl,
              excerpt: ogDesc,
              featuredImage: ogImage,
              publishedAt,
              sourceName: 'GMA Network',
              authorName: 'GMA Entertainment',
            });
          } catch {
            // Skip individual article timeout cleanly
          }
        }
      }
    } catch (err) {
      errors.push(
        `GMA Entertainment listing fetch failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  } else {
    errors.push('Skipped GMA Entertainment listing because robots.txt disallowed the path.');
  }

  const candidates: CandidateArticle[] = [];
  for (const item of discoveredLinks.values()) {
    if (item.title && item.originalUrl && item.publishedAt) {
      candidates.push({
        title: item.title,
        originalUrl: item.originalUrl,
        excerpt: item.excerpt || '',
        featuredImage: item.featuredImage || '',
        publishedAt: item.publishedAt,
        sourceName: 'GMA Network',
        authorName: item.authorName || 'GMA Network',
      });
    }
  }

  return { candidates, errors };
}

async function fetchAbsCbnArticles(): Promise<{
  candidates: CandidateArticle[];
  errors: string[];
}> {
  const errors: string[] = [];
  const candidates: CandidateArticle[] = [];

  try {
    const sitemapUrl = 'https://www.abs-cbn.com/sitemap.xml';
    const res = await fetchWithTimeout(sitemapUrl, 10000);
    if (!res.ok) {
      errors.push(`ABS-CBN sitemap returned HTTP ${res.status}`);
      return { candidates, errors };
    }

    const xml = await res.text();
    const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/gi) || [];
    const matchedUrls: { loc: string; lastmod: string | null }[] = [];

    for (const block of urlBlocks) {
      const loc = decodeHtmlEntities(block.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1] || '');
      const lastmod = decodeHtmlEntities(
        block.match(/<lastmod>([\s\S]*?)<\/lastmod>/i)?.[1] || ''
      );
      if (!loc || !isTrustedSourceUrl(loc)) continue;
      if (!isPbbCollab3Relevant('', loc)) continue;
      matchedUrls.push({
        loc,
        lastmod: lastmod && !Number.isNaN(new Date(lastmod).getTime()) ? new Date(lastmod).toISOString() : null,
      });
    }

    // Fetch up to 12 matched canonical ABS-CBN pages to extract verified headline, excerpt, featured_image, and publication date
    for (const entry of matchedUrls.slice(0, 12)) {
      try {
        const pageRes = await fetchWithTimeout(entry.loc, 9000);
        if (!pageRes.ok) continue;
        const html = await pageRes.text();
        const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (!nextMatch?.[1]) continue;

        const nextData = JSON.parse(nextMatch[1]) as {
          props?: {
            pageProps?: {
              content?: Record<string, unknown>;
              pageInfo?: { data?: Record<string, unknown> };
            };
          };
        };

        const content = (nextData?.props?.pageProps?.content || {}) as Record<string, unknown>;
        const pageData = (nextData?.props?.pageProps?.pageInfo?.data || {}) as Record<
          string,
          unknown
        >;
        const extra = (pageData.extra || {}) as Record<string, unknown>;

        const headline = String(
          pageData.headline || content.headline || extractMetaContent(html, 'og:title') || ''
        ).trim();
        const tags = String(extra.tags || '');
        const descriptionText = String(
          content.description_text ||
            content.abstract ||
            extractMetaContent(html, 'og:description') ||
            ''
        ).trim();

        const rawPublished =
          String(
            pageData.firstpublished ||
              pageData.firstcreated ||
              content._created ||
              entry.lastmod ||
              ''
          ).trim();
        const publishedDate = rawPublished ? new Date(rawPublished) : null;
        const publishedAt =
          publishedDate && !Number.isNaN(publishedDate.getTime())
            ? publishedDate.toISOString()
            : null;

        if (!headline || !publishedAt) continue;
        if (!isPbbCollab3Relevant(headline, entry.loc, descriptionText, tags)) continue;

        // Extract authorized thumbnail URL referenced in publisher metadata
        let featuredImage = '';
        const thumb = (pageData.associations as Record<string, unknown> | undefined)?.Thumbnail as
          | { renditions?: { viewImage?: { media?: string }; original?: { media?: string } } }
          | undefined;
        const contentThumb = (content.associations as Record<string, unknown> | undefined)
          ?.Thumbnail as { media?: string } | undefined;
        const mediaPath =
          thumb?.renditions?.viewImage?.media ||
          thumb?.renditions?.original?.media ||
          contentThumb?.media;

        if (mediaPath) {
          featuredImage = `https://od2-image-api.abs-cbn.com/prod/${mediaPath}`;
        } else {
          const ogImg = extractMetaContent(html, 'og:image');
          if (ogImg && !ogImg.includes('od2-ogimage.png')) {
            featuredImage = ogImg;
          }
        }

        const slugPath = typeof extra.slugline_url === 'string' ? extra.slugline_url : '';
        const canonicalUrl = slugPath
          ? `https://www.abs-cbn.com/${slugPath.replace(/^\/+/, '')}`
          : entry.loc;

        candidates.push({
          title: headline,
          originalUrl: canonicalUrl,
          excerpt: descriptionText,
          featuredImage,
          publishedAt,
          sourceName: 'ABS-CBN',
          authorName: 'ABS-CBN News',
        });
      } catch {
        // Ignore single article parse failure and continue
      }
    }
  } catch (err) {
    errors.push(
      `ABS-CBN fetch failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return { candidates, errors };
}

export async function runNewsFetchCycle(
  trigger: 'scheduler' | 'manual' | 'startup'
): Promise<NewsFetchLog> {
  if (activeFetchPromise) {
    return activeFetchPromise;
  }

  activeFetchPromise = (async () => {
    const startedAt = new Date().toISOString();
    memoryStore.config.lastAttemptAt = startedAt;
    memoryStore.config.nextScheduledAt = new Date(Date.now() + FETCH_INTERVAL_MS).toISOString();

    const sourcesChecked = ['GMA Network', 'ABS-CBN'];
    const allErrors: string[] = [];

    const [gmaResult, absResult] = await Promise.all([
      fetchGmaArticles(),
      fetchAbsCbnArticles(),
    ]);

    allErrors.push(...gmaResult.errors, ...absResult.errors);
    const allCandidates = [...gmaResult.candidates, ...absResult.candidates];

    const existingUrlSet = new Set(
      memoryStore.articles
        .map((a) => (a.original_article_url ? normalizeCanonicalUrl(a.original_article_url) : ''))
        .filter(Boolean)
    );

    let newArticlesAdded = 0;
    let duplicatesSkipped = 0;
    const nowIso = new Date().toISOString();

    for (const candidate of allCandidates) {
      if (!isTrustedSourceUrl(candidate.originalUrl)) continue;
      const canonical = normalizeCanonicalUrl(candidate.originalUrl);
      if (existingUrlSet.has(canonical)) {
        duplicatesSkipped += 1;
        continue;
      }
      existingUrlSet.add(canonical);

      const excerpt = buildExcerptSummary(candidate.excerpt, candidate.title, candidate.sourceName);
      const category = categorizeArticle(candidate.title, excerpt, candidate.originalUrl);
      const id = `auto-${Buffer.from(canonical).toString('base64url').slice(0, 22)}`;
      const slug = `${slugifyTitle(candidate.title, id)}-${id.slice(-5)}`;
      const approvalStatus: NewsApprovalStatus = memoryStore.config.autoPublish
        ? 'approved'
        : 'pending';

      const article: NewsArticle = {
        id,
        slug,
        title: candidate.title.slice(0, 195),
        excerpt: excerpt.slice(0, 420),
        content: buildSummaryAttributionBody(excerpt, candidate.sourceName, candidate.originalUrl),
        category,
        imageUrl: candidate.featuredImage,
        featured_image: candidate.featuredImage,
        original_article_url: candidate.originalUrl,
        source_name: candidate.sourceName,
        authorName: candidate.authorName,
        featured: false,
        publishedAt: candidate.publishedAt || nowIso,
        published_at: candidate.publishedAt || nowIso,
        fetched_at: nowIso,
        approval_status: approvalStatus,
        isAutoCollected: true,
        created_at: nowIso,
      };

      memoryStore.articles.push(article);
      newArticlesAdded += 1;
    }

    // Sort newest articles first by published_at / publishedAt
    memoryStore.articles.sort(
      (a, b) =>
        new Date(b.published_at || b.publishedAt).getTime() -
        new Date(a.published_at || a.publishedAt).getTime()
    );

    const status: NewsFetchLog['status'] =
      allErrors.length === 0
        ? 'success'
        : allCandidates.length > 0
        ? 'partial'
        : 'error';

    if (status === 'success' || status === 'partial') {
      memoryStore.config.lastSuccessfulUpdate = nowIso;
      memoryStore.config.lastError = allErrors.length > 0 ? allErrors.join(' | ') : null;
    } else {
      memoryStore.config.lastError = allErrors.join(' | ') || 'Unknown source fetch error';
    }

    const logEntry: NewsFetchLog = {
      id: `fetch-${Date.now().toString(36)}`,
      timestamp: nowIso,
      trigger,
      status,
      sourcesChecked,
      discoveredCount: allCandidates.length,
      newArticlesAdded,
      duplicatesSkipped,
      errors: allErrors,
    };

    memoryStore.logs.unshift(logEntry);
    memoryStore.logs = memoryStore.logs.slice(0, 50);
    saveStoreToDisk();

    return logEntry;
  })();

  try {
    return await activeFetchPromise;
  } finally {
    activeFetchPromise = null;
  }
}

export function startNewsScheduler() {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
  }
  if (memoryStore.config.enabled) {
    setTimeout(() => {
      if (memoryStore.config.enabled) {
        void runNewsFetchCycle('startup');
      }
    }, 3500);
  }
  schedulerHandle = setInterval(() => {
    if (memoryStore.config.enabled) {
      void runNewsFetchCycle('scheduler');
    } else {
      memoryStore.config.nextScheduledAt = null;
      saveStoreToDisk();
    }
  }, FETCH_INTERVAL_MS);
}

export function getPublicNewsFeed() {
  const approved = memoryStore.articles
    .filter((a) => (a.approval_status || 'approved') === 'approved')
    .sort(
      (a, b) =>
        new Date(b.published_at || b.publishedAt).getTime() -
        new Date(a.published_at || a.publishedAt).getTime()
    );

  return {
    articles: approved,
    lastSuccessfulUpdate: memoryStore.config.lastSuccessfulUpdate,
    enabled: memoryStore.config.enabled,
    intervalMinutes: memoryStore.config.intervalMinutes,
  };
}

export function getAdminNewsState(): NewsAdminState {
  return {
    config: { ...memoryStore.config },
    articles: [...memoryStore.articles],
    logs: [...memoryStore.logs],
  };
}

export function updateNewsFetchConfig(updates: {
  enabled?: boolean;
  autoPublish?: boolean;
}): NewsFetchConfig {
  if (typeof updates.enabled === 'boolean') {
    memoryStore.config.enabled = updates.enabled;
    memoryStore.config.nextScheduledAt = updates.enabled
      ? new Date(Date.now() + FETCH_INTERVAL_MS).toISOString()
      : null;
  }
  if (typeof updates.autoPublish === 'boolean') {
    memoryStore.config.autoPublish = updates.autoPublish;
  }
  saveStoreToDisk();
  return { ...memoryStore.config };
}

export function moderateCollectedNewsArticle(payload: {
  id: string;
  action: 'approve' | 'reject' | 'edit' | 'delete';
  title?: string;
  excerpt?: string;
  category?: NewsCategory;
  featured?: boolean;
}): NewsAdminState {
  const idx = memoryStore.articles.findIndex((a) => a.id === payload.id);
  if (idx === -1) {
    throw new Error('Collected article not found.');
  }

  if (payload.action === 'delete') {
    memoryStore.articles.splice(idx, 1);
    saveStoreToDisk();
    return getAdminNewsState();
  }

  const current = memoryStore.articles[idx];
  const updated: NewsArticle = { ...current };

  if (payload.action === 'approve') {
    updated.approval_status = 'approved';
  } else if (payload.action === 'reject') {
    updated.approval_status = 'rejected';
  }

  if (typeof payload.title === 'string' && payload.title.trim()) {
    updated.title = payload.title.trim().slice(0, 195);
  }
  if (typeof payload.excerpt === 'string' && payload.excerpt.trim()) {
    const cleanExcerpt = payload.excerpt.trim().slice(0, 420);
    updated.excerpt = cleanExcerpt;
    updated.content = buildSummaryAttributionBody(
      cleanExcerpt,
      updated.source_name || 'GMA Network',
      updated.original_article_url || 'https://www.gmanetwork.com/'
    );
  }
  if (payload.category) {
    updated.category = payload.category;
  }
  if (typeof payload.featured === 'boolean') {
    updated.featured = payload.featured;
  }

  memoryStore.articles[idx] = updated;
  saveStoreToDisk();
  return getAdminNewsState();
}
