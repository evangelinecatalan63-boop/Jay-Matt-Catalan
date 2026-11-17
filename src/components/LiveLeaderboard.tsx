import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Crown, TrendingUp, Vote } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { Housemate } from '../types/index.ts';

type LeaderboardScope = 'active-poll' | 'combined';

interface LiveLeaderboardProps {
  activePollId?: string;
  onVoteHousemate?: (housemateId: string) => void;
}

interface LeaderboardEntry {
  housemate: Housemate;
  votes: number;
  sharePct: number;
  relativePct: number;
  gapToLeader: number;
}

const RANK_LABELS = ['01', '02', '03', '04', '05'] as const;

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({
  activePollId,
  onVoteHousemate,
}) => {
  const { fanPolls, rankingCategories, housemates, dataLoading } = useData();
  const [scope, setScope] = useState<LeaderboardScope>('active-poll');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const activePoll = useMemo(() => {
    if (activePollId) {
      const matched = fanPolls.find((p) => p.id === activePollId);
      if (matched) return matched;
    }
    return fanPolls.find((p) => p.status === 'open') || fanPolls[0] || null;
  }, [fanPolls, activePollId]);

  const { topFive, poolTotalVotes, scopeSubtitle, isPollOpen } = useMemo(() => {
    const totalsByHousemate = new Map<string, number>();

    if (scope === 'active-poll' && activePoll) {
      for (const hid of activePoll.housemateIds) {
        totalsByHousemate.set(hid, activePoll.optionCounts?.[hid] || 0);
      }
      // Include any extra keys present in optionCounts
      if (activePoll.optionCounts) {
        for (const [hid, count] of Object.entries(activePoll.optionCounts)) {
          totalsByHousemate.set(hid, Math.max(totalsByHousemate.get(hid) || 0, count || 0));
        }
      }
    } else {
      for (const poll of fanPolls) {
        if (poll.optionCounts) {
          for (const [hid, count] of Object.entries(poll.optionCounts)) {
            totalsByHousemate.set(hid, (totalsByHousemate.get(hid) || 0) + (count || 0));
          }
        }
      }
      for (const cat of rankingCategories) {
        if (cat.counts) {
          for (const [hid, count] of Object.entries(cat.counts)) {
            totalsByHousemate.set(hid, (totalsByHousemate.get(hid) || 0) + (count || 0));
          }
        }
      }
    }

    const combinedSum = Array.from(totalsByHousemate.values()).reduce((sum, n) => sum + n, 0);

    const ranked = Array.from(totalsByHousemate.entries())
      .map(([hid, votes]) => ({
        housemate: housemates.find((h) => h.id === hid),
        votes,
      }))
      .filter((item): item is { housemate: Housemate; votes: number } => Boolean(item.housemate))
      .sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        if (a.housemate.orderIndex !== b.housemate.orderIndex) {
          return a.housemate.orderIndex - b.housemate.orderIndex;
        }
        return a.housemate.fullName.localeCompare(b.housemate.fullName);
      })
      .slice(0, 5);

    const leaderVotes = ranked[0]?.votes || 0;
    const entries: LeaderboardEntry[] = ranked.map((item) => ({
      housemate: item.housemate,
      votes: item.votes,
      sharePct: combinedSum > 0 ? (item.votes / combinedSum) * 100 : 0,
      relativePct: leaderVotes > 0 ? Math.max(4, (item.votes / leaderVotes) * 100) : 0,
      gapToLeader: leaderVotes > item.votes ? leaderVotes - item.votes : 0,
    }));

    const pollOpen = Boolean(activePoll && activePoll.status === 'open');
    const subtitle =
      scope === 'active-poll' && activePoll
        ? `${activePoll.title} · Real-time standings`
        : 'Combined across all active fan polls & power rankings';

    return {
      topFive: entries,
      poolTotalVotes: combinedSum,
      scopeSubtitle: subtitle,
      isPollOpen: pollOpen,
    };
  }, [scope, activePoll, fanPolls, rankingCategories, housemates]);

  const topFiveSum = useMemo(
    () => topFive.reduce((sum, entry) => sum + entry.votes, 0),
    [topFive]
  );

  const canVoteDirectly = useMemo(() => {
    if (!onVoteHousemate || !activePoll || !isPollOpen) return false;
    return true;
  }, [onVoteHousemate, activePoll, isPollOpen]);

  const getBarClass = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500';
      case 1:
        return 'bg-gradient-to-r from-amber-500/85 to-amber-600/90';
      case 2:
        return 'bg-gradient-to-r from-amber-600/75 to-amber-700/80';
      case 3:
        return 'bg-gradient-to-r from-zinc-500 to-zinc-600 dark:from-zinc-400/70 dark:to-zinc-500/80';
      default:
        return 'bg-gradient-to-r from-zinc-400 to-zinc-500 dark:from-zinc-500/70 dark:to-zinc-600/80';
    }
  };

  return (
    <section
      aria-labelledby="live-leaderboard-heading"
      className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#111116] p-5 sm:p-6 space-y-5"
    >
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <BarChart3 className="h-3.5 w-3.5 shrink-0" />
            <span>Live Leaderboard · Top 5 by Vote Count</span>
          </div>
          <h2
            id="live-leaderboard-heading"
            className="font-display text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white"
          >
            Top 5 Housemates Leading the Vote
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{scopeSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Scope Filter */}
          <div
            role="group"
            aria-label="Leaderboard scope"
            className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-white/5 p-1 border border-zinc-200 dark:border-white/10"
          >
            <button
              type="button"
              onClick={() => setScope('active-poll')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                scope === 'active-poll'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              Active Poll
            </button>
            <button
              type="button"
              onClick={() => setScope('combined')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                scope === 'combined'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              All Votes Combined
            </button>
          </div>

          <div className="text-right font-mono-tabular">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Pool Volume</div>
            <div className="text-sm font-bold text-zinc-950 dark:text-white">
              {poolTotalVotes.toLocaleString()} votes
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {dataLoading && topFive.length === 0 ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading leaderboard">
          {[0, 1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 rounded-xl border border-zinc-200/70 dark:border-white/5 p-3 animate-pulse"
            >
              <div className="h-5 w-6 rounded bg-zinc-200 dark:bg-white/10" />
              <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-36 rounded bg-zinc-200 dark:bg-white/10" />
                <div className="h-6 w-full rounded-lg bg-zinc-100 dark:bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : topFive.length === 0 ? (
        /* Empty State */
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-white/15 p-10 text-center space-y-2">
          <TrendingUp className="h-6 w-6 text-zinc-400 mx-auto" />
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            No votes recorded in this leaderboard yet
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Cast points on any nominated housemate card below to see live Top 5 rankings update immediately.
          </p>
        </div>
      ) : (
        /* Real-Time Bar Chart Visualization */
        <div className="space-y-3">
          {/* Scale Reference Header */}
          <div className="hidden sm:grid sm:grid-cols-12 items-center px-3 text-[11px] font-mono-tabular text-zinc-400 dark:text-zinc-500">
            <div className="col-span-4">Rank &amp; Housemate</div>
            <div className="col-span-6 flex items-center justify-between pr-2">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>Leader (100%)</span>
            </div>
            <div className="col-span-2 text-right">Votes · Share</div>
          </div>

          <div className="space-y-2.5">
            {topFive.map((entry, idx) => {
              const { housemate, votes, sharePct, relativePct, gapToLeader } = entry;
              const isLeader = idx === 0;
              const isInActivePoll = Boolean(
                activePoll && activePoll.housemateIds.includes(housemate.id)
              );
              const rowInteractive = canVoteDirectly && (scope === 'active-poll' || isInActivePoll);
              const barRatio = Math.max(0.03, Math.min(1, relativePct / 100));
              const imgError = Boolean(failedImages[housemate.id]);

              return (
                <motion.div
                  key={housemate.id}
                  layout
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className={`grid grid-cols-1 sm:grid-cols-12 items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
                    isLeader
                      ? 'border-amber-500/45 bg-amber-500/[0.06] dark:bg-amber-500/[0.07]'
                      : 'border-zinc-200/80 dark:border-white/10 bg-zinc-50/60 dark:bg-white/[0.02]'
                  }`}
                >
                  {/* Column 1: Rank + Avatar + Name */}
                  <div className="sm:col-span-4 flex items-center gap-3 min-w-0">
                    <div className="w-7 shrink-0 flex items-center justify-center">
                      {isLeader ? (
                        <Crown
                          className="h-4 w-4 text-amber-500"
                          aria-label="Rank 1 Leader"
                        />
                      ) : (
                        <span className="font-mono-tabular text-xs font-bold text-zinc-500 dark:text-zinc-400">
                          {RANK_LABELS[idx]}
                        </span>
                      )}
                    </div>

                    {imgError || !housemate.photoUrl ? (
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 border border-white/15"
                        style={{ backgroundColor: housemate.avatarColor || '#D4AF37' }}
                      >
                        {housemate.fullName.slice(0, 2).toUpperCase()}
                      </div>
                    ) : (
                      <img
                        src={housemate.photoUrl}
                        alt={housemate.fullName}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [housemate.id]: true }))
                        }
                        className={`h-10 w-10 rounded-full object-cover shrink-0 border ${
                          isLeader
                            ? 'border-amber-500'
                            : 'border-zinc-300 dark:border-white/15'
                        }`}
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-display text-sm font-bold text-zinc-950 dark:text-white truncate">
                          {housemate.fullName}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        <span>{housemate.network || 'Housemate'}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="capitalize">{housemate.status}</span>
                      </p>
                    </div>
                  </div>

                  {/* Column 2: Animated Bar Track */}
                  <div className="sm:col-span-6 flex items-center gap-3">
                    <div
                      className="relative h-8 flex-1 overflow-hidden rounded-lg bg-zinc-200/80 dark:bg-white/10"
                      role="progressbar"
                      aria-label={`${housemate.fullName} vote share relative to leader`}
                      aria-valuenow={Math.round(relativePct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      {/* Subtle vertical chart gridlines */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 flex justify-between px-[25%]"
                      >
                        <div className="h-full w-px bg-zinc-300/60 dark:bg-white/10" />
                        <div className="h-full w-px bg-zinc-300/60 dark:bg-white/10" />
                        <div className="h-full w-px bg-zinc-300/60 dark:bg-white/10" />
                      </div>

                      {/* Compositor-animated bar fill via scaleX */}
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: barRatio }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        style={{ transformOrigin: 'left center' }}
                        className={`h-full w-full rounded-lg ${getBarClass(idx)}`}
                      />
                    </div>

                    {rowInteractive && (
                      <button
                        type="button"
                        onClick={() => onVoteHousemate?.(housemate.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-zinc-950 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        title={`Vote for ${housemate.fullName}`}
                      >
                        <Vote className="h-3.5 w-3.5" />
                        <span>Vote</span>
                      </button>
                    )}
                  </div>

                  {/* Mobile Stats Line */}
                  <div className="flex sm:hidden items-center justify-between text-xs font-mono-tabular">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {isLeader
                        ? 'Leading the poll'
                        : gapToLeader > 0
                          ? `-${gapToLeader.toLocaleString()} behind #1`
                          : 'Tied for 1st'}
                    </span>
                    <span className="font-bold text-zinc-950 dark:text-white">
                      {votes.toLocaleString()} votes ·{' '}
                      <span className="text-amber-600 dark:text-amber-400">
                        {sharePct.toFixed(1)}%
                      </span>
                    </span>
                  </div>

                  {/* Column 3: Tabular Count, Pool Share & Gap */}
                  <div className="hidden sm:flex sm:col-span-2 flex-col items-end justify-center font-mono-tabular">
                    <span className="text-sm font-bold text-zinc-950 dark:text-white">
                      {votes.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      {sharePct.toFixed(1)}%{' '}
                      <span className="font-normal text-zinc-500 dark:text-zinc-400">
                        {isLeader
                          ? '· #1'
                          : gapToLeader > 0
                            ? `· -${gapToLeader.toLocaleString()}`
                            : '· Tied'}
                      </span>
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Summary Footer Line */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200 dark:border-white/10 text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              Top 5 account for{' '}
              <strong className="font-mono-tabular text-zinc-900 dark:text-zinc-200">
                {topFiveSum.toLocaleString()}
              </strong>{' '}
              of{' '}
              <strong className="font-mono-tabular text-zinc-900 dark:text-zinc-200">
                {poolTotalVotes.toLocaleString()}
              </strong>{' '}
              total votes (
              <span className="font-mono-tabular">
                {poolTotalVotes > 0 ? ((topFiveSum / poolTotalVotes) * 100).toFixed(1) : '0.0'}%
              </span>
              )
            </span>
            <span>Real-time Firestore sync active · Unofficial community fan poll</span>
          </div>
        </div>
      )}
    </section>
  );
};
