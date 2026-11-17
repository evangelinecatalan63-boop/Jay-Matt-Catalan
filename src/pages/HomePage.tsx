import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Play, Radio, Calendar, Vote, Users, ExternalLink, Clock } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { CountdownTimer } from '../components/CountdownTimer.tsx';
import { PowerRankingBoard } from '../components/PowerRankingBoard.tsx';

const FALLBACK_NEWS_IMAGE = '/assets/aistudio/pbb_d205f7c518_28f387a6.jpg';

export const HomePage: React.FC = () => {
  const {
    housemates,
    livestreams,
    schedule,
    fanPolls,
    newsArticles,
    newsLastSuccessfulUpdate,
    announcements,
    siteSettings,
    visitorCount,
  } = useData();

  const featuredHousemates = housemates.filter((h) => h.featured).slice(0, 4);
  const displayHousemates =
    featuredHousemates.length > 0 ? featuredHousemates : housemates.slice(0, 4);

  const featuredPoll =
    fanPolls.find((p) => p.status === 'open' && p.isFeatured) ||
    fanPolls.find((p) => p.status === 'open') ||
    fanPolls[0];

  const primaryStream = livestreams.find((l) => l.isPrimary) || livestreams[0];
  const isStreamLive = primaryStream?.status === 'live' && Boolean(primaryStream.streamUrl);

  const activeAnnouncements = announcements.filter((a) => a.active);
  const latestNews = newsArticles.slice(0, 4);
  const upcomingEvents = schedule.filter((s) => s.isUpcoming).slice(0, 4);

  const totalFanVotes = fanPolls.reduce((acc, p) => acc + (p.totalVotes || 0), 0);
  const activeHousemateCount = housemates.filter(
    (h) => h.status === 'active' || h.status === 'nominated'
  ).length;

  return (
    <div className="space-y-20 pb-20">
      {/* Optional Admin Announcement Strip */}
      {siteSettings.announcementBannerEnabled && siteSettings.announcementBannerText && (
        <div className="border-b border-amber-500/20 bg-amber-500/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
            <p className="font-medium">{siteSettings.announcementBannerText}</p>
            <Link
              to="/voting"
              className="font-semibold text-amber-700 dark:text-amber-300 hover:underline whitespace-nowrap"
            >
              View Fan Polls →
            </Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 relative overflow-hidden rounded-2xl border border-blue-200/80 dark:border-sky-400/20 px-6 py-8 sm:px-8 sm:py-10 flex flex-col justify-center"
          >
            <img
              src="/assets/aistudio/pbb_d205f7c518_28f387a6.jpg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-25 dark:opacity-40"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#F3F8FF]/92 via-[#EDF4FF]/80 to-[#FFF4F4]/65 dark:from-[#030E26]/92 dark:via-[#071A42]/80 dark:to-[#1E0A1D]/65"
            />
            <div className="relative z-10 flex flex-col justify-center space-y-6">
              <div className="text-xs font-semibold tracking-wider text-[#0E5CD6] dark:text-amber-400">
                {isStreamLive ? (
                  <span className="inline-flex items-center gap-2 text-[#D91E2A] dark:text-red-400">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    24/7 Live House Stream Active
                  </span>
                ) : (
                  'PBB Collab 3.0 · Official Hub'
                )}
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.08] text-slate-950 dark:text-white max-w-2xl">
                {siteSettings.heroWelcomeTitle || 'WELCOME TO PINOY BIG BROTHER 3.0'}
              </h1>

              <p className="text-base sm:text-lg text-slate-700 dark:text-sky-100/85 leading-relaxed max-w-xl">
                {siteSettings.heroDescription}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/live"
                  className="inline-flex items-center gap-2.5 rounded-xl bg-[#D91E2A] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-[#EE2836] transition-colors whitespace-nowrap shrink-0"
                >
                  <Play className="h-4 w-4 fill-current" />
                  WATCH LIVE NOW
                </Link>
                <Link
                  to="/voting"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#0E5CD6]/35 dark:border-sky-400/30 bg-white/90 dark:bg-[#0B1E4A]/80 px-5 py-3.5 text-sm font-semibold text-[#0A2558] dark:text-white hover:border-amber-400 transition-colors whitespace-nowrap shrink-0"
                >
                  Fan Polls
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Hero Visual Frame */}
          <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
            <div className="relative aspect-square w-full max-w-[440px] overflow-hidden rounded-2xl border border-blue-200 dark:border-sky-400/25 bg-[#040D24] shadow-2xl shadow-blue-950/35">
              <img
                src={siteSettings.heroBannerUrl}
                alt="PINOY BIG BROTHER 3.0 official season banner"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover object-center"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#020817]/95 via-[#040D24]/75 to-transparent px-5 pt-10 pb-4 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                  {primaryStream?.cameraLabel || 'Main House Broadcast'}
                </p>
                <p className="font-display text-base font-bold text-white leading-snug">
                  {primaryStream?.title || '24/7 Live House Broadcast'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Website Statistics Strip */}
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 border-y border-blue-200/80 dark:border-sky-400/15 py-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-sky-200/70">
              <Users className="h-3.5 w-3.5 text-[#0E5CD6] dark:text-sky-400" />
              <span>Active Housemates</span>
            </div>
            <p className="font-mono-tabular text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
              {activeHousemateCount}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-sky-200/70">
              <Vote className="h-3.5 w-3.5 text-[#D91E2A] dark:text-red-400" />
              <span>Community Fan Votes</span>
            </div>
            <p className="font-mono-tabular text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
              {totalFanVotes.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-sky-200/70">
              <Radio className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
              <span>Authorized Cameras</span>
            </div>
            <p className="font-mono-tabular text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
              {livestreams.length}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-sky-200/70">
              <Calendar className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
              <span>Hub Visitors</span>
            </div>
            <p className="font-mono-tabular text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
              {visitorCount.toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      {/* Featured Housemates Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Season Roster
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white">
              Featured Housemates
            </h2>
          </div>
          <Link
            to="/housemates"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap"
          >
            View All Housemates
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayHousemates.map((hm) => (
            <Link
              key={hm.id}
              to={`/housemates/${hm.slug}`}
              className="group overflow-hidden rounded-2xl border border-blue-200/80 dark:border-sky-400/15 bg-white dark:bg-[#08173A] transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#040D24]">
                <img
                  src={hm.photoUrl}
                  alt={hm.fullName}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="text-xs text-zinc-300 flex items-center gap-1.5">
                    <span className="capitalize font-medium text-amber-400">{hm.status}</span>
                    <span aria-hidden="true">·</span>
                    <span>Day {hm.enteredDay}</span>
                  </div>
                  <h3 className="mt-1 font-display text-lg font-bold text-white truncate">
                    {hm.nickname} — {hm.fullName}
                  </h3>
                  <p className="text-xs text-zinc-300 truncate">{hm.hometown}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Live Automatic Power Rankings (Nominate · Save · Support) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Live Community Standings
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white">
              Vote to Nominate, Save &amp; Support
            </h2>
          </div>
          <Link
            to="/voting"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap"
          >
            Full Voting Hub
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <PowerRankingBoard maxRows={8} showViewAllLink />
      </section>

      {/* Current Fan Poll Spotlight */}
      {featuredPoll && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-blue-200/80 dark:border-sky-400/15 bg-white dark:bg-[#08173A] p-6 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 space-y-4">
                <div className="text-xs font-semibold text-[#0E5CD6] dark:text-amber-400 flex items-center gap-2">
                  <span>Unofficial Community Fan Poll</span>
                  <span aria-hidden="true">·</span>
                  <span className="uppercase">{featuredPoll.status}</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
                  {featuredPoll.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-sky-100/75 leading-relaxed">
                  {featuredPoll.description}
                </p>
                <div className="pt-2">
                  <CountdownTimer
                    targetIso={featuredPoll.endDate}
                    label="Poll window closes in"
                  />
                </div>
                <div className="pt-2">
                  <Link
                    to="/voting"
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-[#040D24] hover:bg-amber-300 transition-colors whitespace-nowrap"
                  >
                    Participate in Fan Poll
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-sky-200/65 pb-2 border-b border-blue-200/80 dark:border-sky-400/15">
                  <span>Current Community Sentiment</span>
                  <span className="font-mono-tabular font-semibold">
                    {featuredPoll.totalVotes.toLocaleString()} total fan votes
                  </span>
                </div>
                {featuredPoll.housemateIds.map((hmId) => {
                  const hm = housemates.find((item) => item.id === hmId);
                  if (!hm) return null;
                  const count = featuredPoll.optionCounts?.[hmId] || 0;
                  const pct =
                    featuredPoll.totalVotes > 0
                      ? Math.round((count / featuredPoll.totalVotes) * 100)
                      : 0;
                  return (
                    <div key={hmId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-950 dark:text-white">
                          {hm.fullName} ({hm.nickname})
                        </span>
                        <span className="font-mono-tabular text-xs font-semibold text-slate-600 dark:text-sky-100/80">
                          {pct}% · {count.toLocaleString()} votes
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-sky-950/80">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#0E5CD6] via-[#F5B727] to-[#D91E2A] transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="pt-2 text-xs text-slate-500 dark:text-sky-200/60">
                  Notice: Results reflect unofficial community fan sentiment only and do not affect official PBB eviction tallies.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Latest News & Upcoming Activities */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Latest News */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <span>Official Coverage · GMA Network &amp; ABS-CBN</span>
                  {newsLastSuccessfulUpdate && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400 font-normal">
                        <Clock className="h-3 w-3" />
                        Updated {new Date(newsLastSuccessfulUpdate).toLocaleString()}
                      </span>
                    </>
                  )}
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white">
                  📰 LATEST PBB COLLAB 3.0 NEWS
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Stay updated with the latest happenings inside the Big Brother house.
                </p>
              </div>
              <Link
                to="/news"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap"
              >
                All Updates
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {latestNews.map((article) => {
                const imgSrc = article.featured_image || article.imageUrl || FALLBACK_NEWS_IMAGE;
                const pubDate = article.published_at || article.publishedAt;
                const sourceName = article.source_name || 'PINOY BIG BROTHER 3.0';

                return (
                  <article
                    key={article.id}
                    className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-blue-200/80 dark:border-sky-400/15 bg-white dark:bg-[#08173A]"
                  >
                    <div>
                      <Link to={`/news/${article.slug}`} className="block aspect-video overflow-hidden bg-[#040D24]">
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
                      <div className="p-5 space-y-2.5">
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
                          <h3 className="font-display text-base sm:text-lg font-bold text-zinc-950 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2">
                            {article.title}
                          </h3>
                        </Link>
                        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
                          {article.excerpt}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 pb-5 pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 dark:border-white/5">
                      <Link
                        to={`/news/${article.slug}`}
                        className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                      >
                        Read More →
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
          </div>

          {/* Upcoming Activities & Bulletins */}
          <div className="lg:col-span-4 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-zinc-950 dark:text-white">
                  Upcoming Activities
                </h2>
                <Link
                  to="/live"
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Full Schedule
                </Link>
              </div>
              <div className="divide-y divide-blue-200/80 dark:divide-sky-400/15 border-y border-blue-200/80 dark:border-sky-400/15">
                {upcomingEvents.map((evt) => (
                  <div key={evt.id} className="py-4 space-y-1">
                    <div className="text-xs text-slate-500 dark:text-sky-200/65 flex items-center gap-2">
                      <span className="font-mono-tabular font-semibold text-[#0E5CD6] dark:text-amber-400">
                        {evt.startTime}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{evt.category}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                      {evt.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-sky-100/70">{evt.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {activeAnnouncements.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-blue-200/80 dark:border-sky-400/15 bg-white dark:bg-[#08173A] p-5">
                <h3 className="font-display text-base font-bold text-zinc-950 dark:text-white">
                  House Bulletins
                </h3>
                <div className="space-y-4">
                  {activeAnnouncements.map((ann) => (
                    <div key={ann.id} className="space-y-1">
                      <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                        {ann.title}
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {ann.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
