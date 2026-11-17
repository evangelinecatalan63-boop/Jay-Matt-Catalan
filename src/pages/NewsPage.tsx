import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, ExternalLink, Search } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { NEWS_CATEGORIES, NewsCategory } from '../types/index.ts';

const CATEGORIES: ('All' | NewsCategory)[] = ['All', ...NEWS_CATEGORIES];
const PAGE_SIZE = 6;
const FALLBACK_NEWS_IMAGE = '/assets/aistudio/pbb_d205f7c518_28f387a6.jpg';

export const NewsPage: React.FC = () => {
  const { newsArticles, newsLastSuccessfulUpdate, newsAutoEnabled } = useData();
  const [category, setCategory] = useState<'All' | NewsCategory>('All');
  const [queryText, setQueryText] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return newsArticles.filter((article) => {
      const catMatch = category === 'All' || article.category === category;
      const textMatch =
        !q ||
        article.title.toLowerCase().includes(q) ||
        article.excerpt.toLowerCase().includes(q) ||
        article.category.toLowerCase().includes(q) ||
        (article.source_name || '').toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [newsArticles, category, queryText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedArticles = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const handleCategoryChange = (cat: 'All' | NewsCategory) => {
    setCategory(cat);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setQueryText(val);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-white/10 pb-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            Official PBB Collab 3.0 Dispatches · GMA Network &amp; ABS-CBN
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950 dark:text-white">
            News &amp; Updates
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Verified PBB Collab 3.0 stories automatically indexed every 30 minutes from official GMA Network and ABS-CBN feeds. Click &ldquo;READ FULL ARTICLE&rdquo; to read full coverage on the publisher&apos;s site.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              Last successful sync:{' '}
              {newsLastSuccessfulUpdate
                ? new Date(newsLastSuccessfulUpdate).toLocaleString()
                : 'Awaiting first scheduled publisher check'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Auto-Sync: {newsAutoEnabled ? 'Every 30 mins' : 'Paused by Admin'}</span>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={queryText}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search news & sources..."
            className="w-full rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-[#08173A] pl-10 pr-4 py-2.5 text-sm text-zinc-950 dark:text-white placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => handleCategoryChange(cat)}
            className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              category === cat
                ? 'bg-zinc-950 dark:bg-amber-500 text-white dark:text-zinc-950'
                : 'border border-zinc-300 dark:border-white/10 bg-white dark:bg-[#08173A] text-zinc-700 dark:text-zinc-300 hover:border-amber-500/50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-12 text-center space-y-2">
          <p className="text-sm font-medium text-zinc-900 dark:text-white">
            No verified articles match this category or search query yet.
          </p>
          <p className="text-xs text-zinc-500">
            Official articles appear here automatically once detected from GMA Network or ABS-CBN.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedArticles.map((article) => {
              const imgSrc = article.featured_image || article.imageUrl || FALLBACK_NEWS_IMAGE;
              const pubDate = article.published_at || article.publishedAt;
              const sourceName = article.source_name || 'PINOY BIG BROTHER 3.0';

              return (
                <article
                  key={article.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A]"
                >
                  <div>
                    <Link to={`/news/${article.slug}`} className="block aspect-video overflow-hidden bg-zinc-900">
                      <img
                        src={imgSrc}
                        alt={article.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.dataset.fallbackApplied) return;
                          target.dataset.fallbackApplied = '1';
                          target.src = FALLBACK_NEWS_IMAGE;
                        }}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </Link>
                    <div className="p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span
                          className={`rounded-md px-2 py-0.5 font-bold uppercase tracking-wide ${
                            sourceName === 'GMA Network'
                              ? 'bg-red-600/15 text-red-600 dark:text-red-400'
                              : sourceName === 'ABS-CBN'
                              ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {sourceName}
                        </span>
                        <span className="font-mono-tabular text-zinc-500 dark:text-zinc-400">
                          {new Date(pubDate).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        {article.category}
                      </p>

                      <Link to={`/news/${article.slug}`} className="block">
                        <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2">
                          {article.title}
                        </h2>
                      </Link>

                      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
                        {article.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3 border-t border-zinc-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
                    <Link
                      to={`/news/${article.slug}`}
                      className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    >
                      Read Summary →
                    </Link>
                    {article.original_article_url && (
                      <a
                        href={article.original_article_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 dark:bg-amber-500 px-3 py-1.5 text-[11px] font-bold uppercase text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-amber-400 transition-colors whitespace-nowrap"
                      >
                        READ FULL ARTICLE
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 dark:border-white/10 pt-6">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-tabular">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of{' '}
                {filtered.length} articles
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-[#08173A] px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-mono-tabular font-semibold cursor-pointer ${
                      pageNum === safePage
                        ? 'bg-amber-500 text-zinc-950'
                        : 'border border-zinc-300 dark:border-white/10 bg-white dark:bg-[#08173A] text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-[#08173A] px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-40 cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

