import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Lock,
  Vote,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { CountdownTimer } from '../components/CountdownTimer.tsx';
import { PowerRankingBoard } from '../components/PowerRankingBoard.tsx';

export const VotingPage: React.FC = () => {
  const { user, openAuthModal, resendVerificationEmail } = useAuth();
  const { fanPolls, housemates, userVotes, castFanVote } = useData();

  const [selectedPollId, setSelectedPollId] = useState<string>('');
  const [confirmCandidateId, setConfirmCandidateId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  const activePoll = useMemo(() => {
    if (selectedPollId) {
      const found = fanPolls.find((p) => p.id === selectedPollId);
      if (found) return found;
    }
    return fanPolls.find((p) => p.status === 'open') || fanPolls[0];
  }, [fanPolls, selectedPollId]);

  const pollCandidates = useMemo(() => {
    if (!activePoll) return [];
    return activePoll.housemateIds
      .map((id) => housemates.find((h) => h.id === id))
      .filter((h): h is NonNullable<typeof h> => Boolean(h));
  }, [activePoll, housemates]);

  const confirmCandidate = useMemo(
    () => housemates.find((h) => h.id === confirmCandidateId) || null,
    [housemates, confirmCandidateId]
  );

  const isWindowOpen = useMemo(() => {
    if (!activePoll || activePoll.status !== 'open') return false;
    const now = Date.now();
    const start = new Date(activePoll.startDate).getTime();
    const end = new Date(activePoll.endDate).getTime();
    if (!Number.isNaN(start) && now < start) return false;
    if (!Number.isNaN(end) && now > end) return false;
    return true;
  }, [activePoll]);

  const userVoteForPoll = activePoll ? userVotes[activePoll.id] : undefined;

  const handleOpenVoteConfirm = (housemateId: string) => {
    setFeedback(null);
    if (!user) {
      openAuthModal('signin');
      return;
    }
    if (!user.emailVerified) {
      setFeedback({
        type: 'error',
        text: 'Please verify your email address before casting a fan poll vote.',
      });
      return;
    }
    setConfirmCandidateId(housemateId);
  };

  const handleConfirmVote = async () => {
    if (!activePoll || !confirmCandidate) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await castFanVote(activePoll.id, confirmCandidate.id);
      setFeedback({
        type: 'success',
        text: `Your community vote for ${confirmCandidate.fullName} has been recorded.`,
      });
      setConfirmCandidateId(null);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to submit vote.',
      });
      setConfirmCandidateId(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Independent Fan Poll Notice */}
      <div className="rounded-2xl border border-sky-400/35 bg-gradient-to-r from-blue-50/90 via-white to-amber-50/60 dark:from-[#0A1D49] dark:via-[#08173A] dark:to-[#181229] p-4 sm:p-5 flex items-start gap-3.5">
        <Info className="h-5 w-5 text-[#0E5CD6] dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-slate-950 dark:text-white">
            Independent PBB ALL ACCESS Fan Poll — Not Affiliated with Official PBB Organization
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-sky-100/80 leading-relaxed">
            This platform is an independent community fan poll and is not affiliated with, endorsed by, or connected to the official Pinoy Big Brother organization. Results reflect fan community sentiment only.
          </p>
        </div>
      </div>

      {/* Verified Community Fan Poll Section */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-blue-200/80 dark:border-sky-400/15 pb-5">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[#0E5CD6] dark:text-amber-400">
              Verified Community Polling · 1 Vote Per Account Per Poll
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-slate-950 dark:text-white">
              {activePoll?.title || 'PINOY BIG BROTHER 3.0 Fan Polls'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-sky-100/75 max-w-2xl">
              Support your favorite nominated housemates and follow real-time community standings.
            </p>
          </div>

          {fanPolls.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {fanPolls.map((poll) => (
                <button
                  key={poll.id}
                  type="button"
                  onClick={() => {
                    setSelectedPollId(poll.id);
                    setFeedback(null);
                  }}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activePoll?.id === poll.id
                      ? 'bg-[#0E5CD6] dark:bg-amber-400 text-white dark:text-[#040D24] font-bold'
                      : 'border border-blue-200 dark:border-sky-400/15 bg-white dark:bg-[#08173A] text-slate-700 dark:text-sky-100 hover:border-amber-400/60'
                  }`}
                >
                  {poll.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {!activePoll ? (
          <div className="rounded-2xl border border-blue-200/80 dark:border-sky-400/15 bg-white dark:bg-[#08173A] p-12 text-center">
            <p className="text-sm text-slate-500 dark:text-sky-200/70">No fan polls are currently configured.</p>
          </div>
        ) : (
          <>
            {/* Poll Details & Countdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-8 rounded-2xl border border-blue-200/80 dark:border-sky-400/15 bg-white dark:bg-[#08173A] p-5 sm:p-6 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span
                      className={`font-mono-tabular text-xs font-bold uppercase ${
                        isWindowOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                      }`}
                    >
                      Voting {isWindowOpen ? 'OPEN' : activePoll.status.toUpperCase()}
                    </span>
                    <span className="font-mono-tabular text-xs text-slate-500 dark:text-sky-200/70">
                      {activePoll.totalVotes.toLocaleString()} total fan votes
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-sky-100/85 leading-relaxed">
                    {activePoll.description}
                  </p>
                </div>

                <div className="border-t border-blue-200/80 dark:border-sky-400/15 pt-3.5 space-y-1">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-sky-100">
                    Fair Community Voting Rules
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-sky-200/70 leading-relaxed">
                    Each email-verified account may cast one official community vote per poll window. Votes cannot be changed once submitted.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-4 rounded-2xl border border-blue-200/80 dark:border-sky-400/15 bg-white dark:bg-[#08173A] p-5 sm:p-6 flex flex-col justify-between gap-4">
                <CountdownTimer
                  targetIso={activePoll.endDate}
                  label={isWindowOpen ? 'Time Remaining in Poll' : 'Poll Window Status'}
                />
                <div className="border-t border-blue-200/80 dark:border-sky-400/15 pt-3 text-xs text-slate-500 dark:text-sky-200/70 space-y-1 font-mono-tabular">
                  <p>Opens: {new Date(activePoll.startDate).toLocaleString()}</p>
                  <p>Closes: {new Date(activePoll.endDate).toLocaleString()}</p>
                </div>

                {!user ? (
                  <button
                    type="button"
                    onClick={() => openAuthModal('signin')}
                    className="w-full rounded-lg bg-[#0E5CD6] dark:bg-amber-400 px-4 py-2.5 text-xs font-bold text-white dark:text-[#040D24] hover:bg-[#1565E8] dark:hover:bg-amber-300 transition-colors cursor-pointer"
                  >
                    Sign In to Cast Vote
                  </button>
                ) : !user.emailVerified ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await resendVerificationEmail();
                      setVerificationSent(true);
                    }}
                    className="w-full rounded-lg border border-amber-400/50 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                  >
                    {verificationSent ? 'Verification Email Sent' : 'Resend Verification Email'}
                  </button>
                ) : userVoteForPoll ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 border-t border-blue-200/80 dark:border-sky-400/15 pt-3 font-medium">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      You voted for{' '}
                      {housemates.find((h) => h.id === userVoteForPoll.housemateId)?.fullName ||
                        'your chosen housemate'}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400 border-t border-blue-200/80 dark:border-sky-400/15 pt-3 font-medium">
                    Verified account ready — choose a candidate below to vote.
                  </p>
                )}
              </div>
            </div>

            {feedback && (
              <div
                className={`rounded-xl border p-4 flex items-center gap-3 text-sm ${
                  feedback.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                    : 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300'
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

            {/* Candidate Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {pollCandidates.map((hm) => {
                const count = activePoll.optionCounts?.[hm.id] || 0;
                const pct =
                  activePoll.totalVotes > 0
                    ? Math.round((count / activePoll.totalVotes) * 100)
                    : 0;
                const votedForThis = userVoteForPoll?.housemateId === hm.id;

                return (
                  <div
                    key={hm.id}
                    className={`flex flex-col justify-between overflow-hidden rounded-2xl border bg-white dark:bg-[#08173A] transition-transform duration-200 hover:-translate-y-0.5 ${
                      votedForThis
                        ? 'border-amber-400/80'
                        : 'border-blue-200/80 dark:border-sky-400/15'
                    }`}
                  >
                    <div>
                      <div className="aspect-[4/4.2] overflow-hidden bg-[#040D24]">
                        <img
                          src={hm.photoUrl}
                          alt={hm.fullName}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="p-4 sm:p-5 space-y-1.5">
                        <div className="text-xs text-slate-500 dark:text-sky-200/70">
                          <span className="capitalize font-medium text-[#0E5CD6] dark:text-amber-400">
                            {hm.network || hm.status}
                          </span>{' '}
                          · {hm.hometown}
                        </div>
                        <h3 className="font-display text-lg font-bold text-slate-950 dark:text-white">
                          {hm.fullName}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-sky-200/70">
                          “{hm.nickname}”
                        </p>
                      </div>
                    </div>

                    <div className="px-4 sm:px-5 pb-5 space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono-tabular">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {pct}%
                          </span>
                          <span className="text-slate-500 dark:text-sky-200/70">
                            {count.toLocaleString()} votes
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-sky-950/80">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#0E5CD6] via-[#F5B727] to-[#D91E2A] transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {!isWindowOpen ? (
                        <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 dark:border-sky-400/15 py-2.5 text-xs font-medium text-slate-500 dark:text-sky-200/60">
                          <Lock className="h-3.5 w-3.5" />
                          Voting Closed
                        </div>
                      ) : !user ? (
                        <button
                          type="button"
                          onClick={() => openAuthModal('signin')}
                          className="w-full rounded-lg bg-[#0E5CD6] dark:bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1565E8] dark:hover:bg-white/20 transition-colors cursor-pointer"
                        >
                          Sign In to Vote
                        </button>
                      ) : userVoteForPoll ? (
                        <div
                          className={`flex w-full items-center justify-center gap-1.5 rounded-lg border py-2.5 text-xs font-semibold ${
                            votedForThis
                              ? 'border-amber-400/60 bg-amber-400/15 text-amber-700 dark:text-amber-300'
                              : 'border-blue-200 dark:border-sky-400/15 text-slate-500 dark:text-sky-200/60'
                          }`}
                        >
                          {votedForThis ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Voted
                            </>
                          ) : (
                            'Vote Cast'
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenVoteConfirm(hm.id)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0E5CD6] via-[#1D6FF2] to-[#0284C7] px-4 py-2.5 text-xs font-bold text-white hover:brightness-110 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <Vote className="h-3.5 w-3.5" />
                          Vote for {hm.nickname}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Poll Standings Table */}
            <div className="rounded-2xl border border-blue-200/80 dark:border-sky-400/15 bg-white dark:bg-[#08173A] p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-slate-950 dark:text-white">
                  Live Fan Poll Standings
                </h3>
                <span className="font-mono-tabular text-xs text-slate-500 dark:text-sky-200/70">
                  {activePoll.totalVotes.toLocaleString()} total community votes
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-blue-200/80 dark:border-sky-400/15 text-xs text-slate-500 dark:text-sky-200/70">
                      <th className="py-3 pr-4 font-medium">Rank</th>
                      <th className="py-3 px-4 font-medium">Housemate</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium text-right">Votes</th>
                      <th className="py-3 pl-4 font-medium text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-200/60 dark:divide-sky-400/10">
                    {[...pollCandidates]
                      .sort(
                        (a, b) =>
                          (activePoll.optionCounts?.[b.id] || 0) -
                          (activePoll.optionCounts?.[a.id] || 0)
                      )
                      .map((hm, idx) => {
                        const count = activePoll.optionCounts?.[hm.id] || 0;
                        const pct =
                          activePoll.totalVotes > 0
                            ? ((count / activePoll.totalVotes) * 100).toFixed(1)
                            : '0.0';
                        return (
                          <tr key={hm.id}>
                            <td className="py-3 pr-4 font-mono-tabular font-bold text-amber-600 dark:text-amber-400">
                              #{idx + 1}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-950 dark:text-white">
                              {hm.fullName}
                            </td>
                            <td className="py-3 px-4 capitalize text-slate-500 dark:text-sky-200/70">
                              {hm.status}
                            </td>
                            <td className="py-3 px-4 text-right font-mono-tabular text-slate-950 dark:text-white">
                              {count.toLocaleString()}
                            </td>
                            <td className="py-3 pl-4 text-right font-mono-tabular font-semibold text-amber-600 dark:text-amber-400">
                              {pct}%
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Live Community Power Rankings (Nominate, Save, Support) */}
      <section className="space-y-6 pt-2">
        <div className="space-y-1.5 border-b border-blue-200/80 dark:border-sky-400/15 pb-5">
          <p className="text-xs font-semibold text-[#0E5CD6] dark:text-amber-400">
            Automatic Category Standings
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Nominate, Save &amp; Support Rankings
          </h2>
          <p className="text-sm text-slate-600 dark:text-sky-100/75 max-w-2xl">
            Vote across Nominate, Save, Support, and admin-created ranking rounds. Standings update automatically as votes arrive.
          </p>
        </div>

        <PowerRankingBoard />
      </section>

      {/* Vote Confirmation Dialog */}
      {confirmCandidate && activePoll && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-fan-vote-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-sky-400/35 bg-white dark:bg-[#08173A] p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <img
                  src={confirmCandidate.photoUrl}
                  alt={confirmCandidate.fullName}
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 rounded-xl object-cover border border-amber-400/50"
                />
                <div>
                  <p className="text-xs font-semibold text-[#0E5CD6] dark:text-amber-400">
                    Confirm Community Vote
                  </p>
                  <h3
                    id="confirm-fan-vote-title"
                    className="font-display text-lg font-bold text-slate-950 dark:text-white"
                  >
                    {confirmCandidate.fullName}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmCandidateId(null)}
                aria-label="Close confirmation"
                className="rounded-lg p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-sky-100/80 leading-relaxed">
              Submit your one-time community vote for{' '}
              <strong className="text-slate-950 dark:text-white">{confirmCandidate.fullName}</strong> in{' '}
              <strong>{activePoll.title}</strong>? Votes are final for this poll window.
            </p>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmCandidateId(null)}
                className="rounded-lg border border-blue-200 dark:border-sky-400/20 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-sky-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmVote}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-5 py-2 text-xs font-bold text-[#040D24] hover:bg-amber-300 disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                <Vote className="h-3.5 w-3.5" />
                {submitting ? 'Submitting...' : 'Confirm Vote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
