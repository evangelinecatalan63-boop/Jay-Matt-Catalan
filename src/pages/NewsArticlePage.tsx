import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Info } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';

const FALLBACK_NEWS_IMAGE = '/assets/aistudio/pbb_d205f7c518_28f387a6.jpg';

export const NewsArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { newsArticles } = useData();

  const article = newsArticles.find((a) => a.slug === slug || a.id === slug);

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white">
          Article Not Found
        </h1>
        <Link
          to="/news"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to News
        </Link>
      </div>
    );
  }

  const related = newsArticles.filter((a) => a.id !== article.id).slice(0, 3);
  const imgSrc = article.featured_image || article.imageUrl || FALLBACK_NEWS_IMAGE;
  const pubDate = article.published_at || article.publishedAt;
  const sourceName = article.source_name || 'PINOY BIG BROTHER 3.0';

  return (
    <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      <div>
        <Link
          to="/news"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All News &amp; Updates
        </Link>
      </div>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span
            className={`rounded-md px-2.5 py-0.5 font-bold uppercase tracking-wide ${
              sourceName === 'GMA Network'
                ? 'bg-red-600/15 text-red-600 dark:text-red-400'
                : sourceName === 'ABS-CBN'
                ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
            }`}
          >
            {sourceName}
          </span>
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {article.category}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">
            {new Date(pubDate).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <span aria-hidden="true">·</span>
          <span>Source Attribution: {article.authorName}</span>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-950 dark:text-white leading-tight">
          {article.title}
        </h1>
        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
          {article.excerpt}
        </p>
      </header>

      {article.isAutoCollected && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 flex items-start gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
          <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p>
            <strong>Automated Summary Notice:</strong> This summary was automatically indexed from official {sourceName} publisher metadata. PINOY BIG BROTHER 3.0 never copies full copyrighted articles — read the complete story directly on {sourceName}.
          </p>
        </div>
      )}

      <div className="aspect-video overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-900">
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
          className="h-full w-full object-cover"
        />
      </div>

      <div className="space-y-5 text-base leading-[1.75] text-zinc-800 dark:text-zinc-200">
        {article.content.split('\n\n').map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>

      {article.original_article_url && (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Official Publisher Link
            </p>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              Continue reading the original full coverage on {sourceName}.
            </p>
          </div>
          <a
            href={article.original_article_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-zinc-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            READ FULL ARTICLE
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}

      {related.length > 0 && (
        <section className="border-t border-zinc-200 dark:border-white/10 pt-10 space-y-6">
          <h2 className="font-display text-xl font-bold text-zinc-950 dark:text-white">
            More Stories
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {related.map((item) => (
              <Link
                key={item.id}
                to={`/news/${item.slug}`}
                className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-4 space-y-2 hover:border-amber-500/50 transition-colors"
              >
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  {item.category} · {item.source_name || 'PINOY BIG BROTHER 3.0'}
                </p>
                <h3 className="font-display text-sm font-bold text-zinc-950 dark:text-white line-clamp-2">
                  {item.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
};

