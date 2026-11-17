import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  MapPin,
  Settings2,
  ShieldCheck,
  Vote,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { Housemate, RankingCategory } from '../types/index.ts';

interface PowerRankingBoardProps {
  maxRows?: number;
  showViewAllLink?: boolean;
}

export const PowerRankingBoard: React.FC<PowerRankingBoardProps> = ({
  maxRows,
  showViewAllLink = false,
}) => {
  const { user, isAdmin, openAuthModal, resendVerificationEmail } = useAuth();
  const { rankingCategories, housemates, userRankingVotes, castRankingVote } = useData();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [confirmTarget, setConfirmTarget] = useState<{
    category: RankingCategory;
    housemate: Housemate;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  const sortedCategories = useMemo(
    () => [...rankingCategories].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    [rankingCategories]
  );

  useEffect(() => {
    if (sortedCategories.length === 0) return;
    if (!selectedCategoryId || !sortedCategories.some((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId(sortedCategories[0].id);
    }
  }, [sortedCategories, selectedCategoryId]);

  const activeCategory = useMemo(
    () =>
      sortedCategories.find((c) => c.id === selectedCategoryId) || sortedCategories[0] || null,
    [sortedCategories, selectedCategoryId]
  );

  // Automatic real-time ranking: sort participating housemates descending by vote count
  const rankedHousemates = useMemo(() => {
    if (!activeCategory) return [];
    const candidatePool =
      activeCategory.housemateIds && activeCategory.housemateIds.length > 0
        ? activeCategory.housemateIds
            .map((id) => housemates.find((h) => h.id === id))
            .filter((h): h is Housemate => Boolean(h))
        : housemates;

    const sorted = [...candidatePool]
      .map((hm) => ({
        housemate: hm,
        votes: activeCategory.counts?.[hm.id] || 0,
      }))
      .sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        if (a.housemate.orderIndex !== b.housemate.orderIndex) {
          return a.housemate.orderIndex - b.housemate.orderIndex;
        }
        return a.housemate.fullName.localeCompare(b.housemate.fullName);
      });

    return typeof maxRows === 'number' && maxRows > 0 ? sorted.slice(0, maxRows) : sorted;
  }, [activeCategory, housemates, maxRows]);

  const userVoteForCategory = activeCategory ? userRankingVotes[activeCategory.id] : undefined;

  const formattedTimestamp = useMemo(() => {
    return new Date().toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [activeCategory?.totalVotes, activeCategory?.id]);

  const handleConfirmVote = async () => {
    if (!confirmTarget) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await castRankingVote(confirmTarget.category.id, confirmTarget.housemate.id);
      setFeedback({
        type: 'success',
        text: `Your "${confirmTarget.category.actionLabel}" vote for ${confirmTarget.housemate.fullName} has been counted and rankings updated automatically.`,
      });
      setConfirmTarget(null);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to submit ranking vote.',
      });
      setConfirmTarget(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeCategory) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-10 text-center space-y-3">
        <p className="text-sm text-zinc-500">No ranking categories configured yet.</p>
        {isAdmin && (
          <Link
            to="/admin?tab=rankings"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Add Ranking Categories
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Category Selector Tabs & Admin Shortcut */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Ranking vote categories"
          className="flex flex-wrap items-center gap-2"
        >
          {sortedCategories.map((cat) => {
            const isActive = cat.id === activeCategory.id;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => {
                  setSelectedCategoryId(cat.id);
                  setFeedback(null);
                }}
                className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#0842C2] text-[#FFD600] shadow-lg shadow-blue-900/25 ring-2 ring-[#FFD600]/80'
                    : 'border border-zinc-300 dark:border-white/15 bg-white dark:bg-[#08173A] text-zinc-700 dark:text-zinc-300 hover:border-blue-500/60'
                }`}
              >
                {cat.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {showViewAllLink && (
            <Link
              to="/voting"
              className="rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-[#08173A] px-4 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:border-amber-500/60 transition-colors whitespace-nowrap"
            >
              Open Full Rankings
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin?tab=rankings"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Edit Categories &amp; Housemates
            </Link>
          )}
        </div>
      </div>

      {/* Email Verification / Feedback Banners */}
      {user && !user.emailVerified && (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-amber-900 dark:text-amber-200 font-medium">
            Verify your email address to cast a verified {activeCategory.shortLabel} vote.
          </span>
          <button
            type="button"
            onClick={async () => {
              await resendVerificationEmail();
              setVerificationSent(true);
            }}
            className="rounded-lg border border-amber-500/40 px-3 py-1.5 font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-500/15 cursor-pointer"
          >
            {verificationSent ? 'Verification Email Sent' : 'Resend Verification Email'}
          </button>
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 flex items-center gap-2.5 text-xs sm:text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
              : 'border-red-500/35 bg-red-500/10 text-red-800 dark:text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Broadcast Blue & Golden Yellow Ranking Card */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-[#1F6BFF]/40 bg-gradient-to-b from-[#0C50E0] via-[#06359B] to-[#041D5C] px-4 py-7 sm:px-8 sm:py-10 shadow-2xl">
        {/* Subtle studio texture overlay */}
        <img
          src="/assets/aistudio/pbb_d205f7c518_28f387a6.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-15 mix-blend-luminosity"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,214,0,0.22),transparent_62%)]"
        />

        <div className="relative z-10 mx-auto max-w-4xl space-y-6">
          {/* Top Broadcast Title Block */}
          <div className="text-center space-y-2.5">
            <p className="font-display text-xs sm:text-base font-extrabold uppercase tracking-[0.14em] text-[#FFD600] drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]">
              {activeCategory.seasonHeader}
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-black uppercase tracking-tight leading-[0.95] text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
              {activeCategory.title}
            </h2>
            <div className="pt-1 flex justify-center">
              <div className="inline-flex flex-col items-center rounded-md border border-white/15 bg-zinc-950 px-4 sm:px-6 py-2 shadow-lg">
                <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-[#FFD600]">
                  {activeCategory.subtitle || `${activeCategory.shortLabel} COMMUNITY VOTE`}
                </span>
                <span className="font-mono-tabular text-[11px] sm:text-xs font-semibold text-zinc-200 mt-0.5">
                  as of {formattedTimestamp} · {activeCategory.totalVotes.toLocaleString()} votes
                </span>
              </div>
            </div>
          </div>

          {/* Column Header Pill (Blue + White Outline) */}
          <div className="rounded-full border-2 border-white bg-gradient-to-r from-[#0B54EC] via-[#0032A8] to-[#0B54EC] px-4 sm:px-7 py-2.5 shadow-lg">
            <div className="grid grid-cols-12 items-center gap-2 text-[11px] sm:text-sm font-black uppercase tracking-wider text-white">
              <div className="col-span-2 sm:col-span-1 text-left">Rank</div>
              <div className="col-span-6 sm:col-span-7 text-left sm:pl-4">Housemate</div>
              <div className="col-span-4 text-right">{activeCategory.valueColumnLabel}</div>
            </div>
          </div>

          {/* Automatic Ranked Rows */}
          {rankedHousemates.length === 0 ? (
            <div className="rounded-2xl border border-white/20 bg-black/30 p-8 text-center text-sm text-white/85">
              No housemates assigned to this category yet.
            </div>
          ) : (
            <div className="space-y-3">
              {rankedHousemates.map(({ housemate: hm, votes }, index) => {
                const rankLabel = String(index + 1).padStart(2, '0');
                const isUserChoice = userVoteForCategory?.housemateId === hm.id;
                const hasVotedInCategory = Boolean(userVoteForCategory);
                const canVote =
                  activeCategory.isOpen &&
                  Boolean(user) &&
                  Boolean(user?.emailVerified) &&
                  !hasVotedInCategory;

                return (
                  <motion.div
                    key={hm.id}
                    layout
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className={`group rounded-full border-[2.5px] px-3 sm:px-6 py-2 sm:py-2.5 shadow-[0_4px_0_rgba(0,0,0,0.42)] transition-colors ${
                      isUserChoice
                        ? 'border-white bg-gradient-to-r from-[#FFF066] via-[#FFD814] to-[#FFB800] ring-2 ring-emerald-400'
                        : 'border-zinc-950 bg-gradient-to-r from-[#FFE300] via-[#FFD000] to-[#F5B700]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 sm:gap-4">
                      {/* Left: Rank + Picture + Name & Location */}
                      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
                        <span className="font-display font-mono-tabular text-lg sm:text-2xl font-black text-zinc-950 w-7 sm:w-10 text-center shrink-0">
                          {rankLabel}
                        </span>

                        <Link
                          to={`/housemates/${hm.slug}`}
                          className="relative h-11 w-11 sm:h-14 sm:w-14 rounded-full border-[2.5px] border-zinc-950 bg-white overflow-hidden shrink-0 shadow-sm hover:scale-105 transition-transform"
                        >
                          {hm.photoUrl ? (
                            <img
                              src={hm.photoUrl}
                              alt={hm.fullName}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover object-center"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-xs font-bold text-amber-400">
                              {hm.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </Link>

                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/housemates/${hm.slug}`}
                            className="block font-display text-sm sm:text-lg font-black uppercase tracking-tight text-zinc-950 truncate hover:underline"
                          >
                            {hm.fullName}
                          </Link>
                          <p className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-zinc-900/80 truncate">
                            <MapPin className="h-3 w-3 shrink-0 text-zinc-950/80" />
                            <span className="truncate">{hm.hometown}</span>
                            {hm.isImmune && (
                              <span className="ml-1 shrink-0 rounded bg-emerald-700 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white">
                                Immune
                              </span>
                            )}
                            {hm.status === 'nominated' && (
                              <span className="ml-1 shrink-0 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white">
                                Nominated
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Right: Auto-sorted Count + Vote Action */}
                      <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
                        <span className="font-display font-mono-tabular text-base sm:text-xl font-black text-zinc-950 text-right">
                          {votes.toLocaleString()}
                        </span>

                        {isUserChoice ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-3 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-extrabold uppercase text-white whitespace-nowrap">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            Voted
                          </span>
                        ) : !activeCategory.isOpen ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-950/20 px-3 py-1.5 text-[11px] font-bold uppercase text-zinc-900 whitespace-nowrap">
                            <Lock className="h-3 w-3 shrink-0" />
                            Closed
                          </span>
                        ) : !user ? (
                          <button
                            type="button"
                            onClick={() => openAuthModal('signin')}
                            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-extrabold uppercase tracking-wide text-[#FFD600] hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Vote className="h-3.5 w-3.5 shrink-0" />
                            {activeCategory.actionLabel}
                          </button>
                        ) : hasVotedInCategory ? (
                          <span className="hidden sm:inline-flex items-center rounded-full bg-zinc-950/15 px-3 py-1.5 text-[11px] font-bold uppercase text-zinc-900 whitespace-nowrap">
                            Done
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!canVote}
                            onClick={() =>
                              setConfirmTarget({
                                category: activeCategory,
                                housemate: hm,
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-extrabold uppercase tracking-wide text-[#FFD600] hover:bg-zinc-800 disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Vote className="h-3.5 w-3.5 shrink-0" />
                            {activeCategory.actionLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Broadcast Footer Strip */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white/90">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#FFD600]" />
              PINOY BIG BROTHER 3.0 · AUTO-RANKED STANDINGS
            </span>
            <span aria-hidden="true" className="text-white/40">
              |
            </span>
            <span className="text-[#FFD600]">
              {activeCategory.isOpen ? 'Voting Open · 1 Vote Per Category' : 'Voting Closed'}
            </span>
          </div>
        </div>
      </div>

      {/* Vote Confirmation Dialog */}
      {confirmTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ranking-vote-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3.5">
              <img
                src={confirmTarget.housemate.photoUrl}
                alt={confirmTarget.housemate.fullName}
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-full border-2 border-amber-500 object-cover bg-zinc-900 shrink-0"
              />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {confirmTarget.category.title}
                </p>
                <h3
                  id="ranking-vote-confirm-title"
                  className="font-display text-xl font-bold text-zinc-950 dark:text-white"
                >
                  {confirmTarget.category.actionLabel} {confirmTarget.housemate.fullName}?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {confirmTarget.housemate.hometown}
                </p>
              </div>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Your verified community vote will immediately update the live{' '}
              <strong>{confirmTarget.category.shortLabel}</strong> tally and automatically recalculate
              housemate rankings.
            </p>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmTarget(null)}
                className="rounded-lg border border-zinc-300 dark:border-white/15 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmVote}
                className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Submitting...' : `Confirm ${confirmTarget.category.actionLabel}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
