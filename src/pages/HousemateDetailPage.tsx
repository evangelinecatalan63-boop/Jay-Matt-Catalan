import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, ShieldCheck, Vote } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';

export const HousemateDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { housemates, fanPolls } = useData();

  const housemate = housemates.find((h) => h.slug === slug || h.id === slug);

  if (!housemate) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white">
          Housemate Profile Not Found
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This housemate profile may have been updated or removed.
        </p>
        <Link
          to="/housemates"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Housemates
        </Link>
      </div>
    );
  }

  const activePoll = fanPolls.find(
    (p) => p.status === 'open' && p.housemateIds.includes(housemate.id)
  );
  const others = housemates.filter((h) => h.id !== housemate.id).slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-16">
      <div>
        <Link
          to="/housemates"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Housemates
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-900 aspect-[4/5]">
            <img
              src={housemate.photoUrl}
              alt={housemate.fullName}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3 border-b border-zinc-200 dark:border-white/10 pb-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              {housemate.network && (
                <>
                  <span
                    className={`rounded-md px-2 py-0.5 uppercase ${
                      housemate.network === 'Kapamilya'
                        ? 'bg-blue-600 text-white'
                        : housemate.network === 'Kapuso'
                        ? 'bg-red-600 text-white'
                        : 'bg-zinc-800 text-zinc-200'
                    }`}
                  >
                    {housemate.network}
                  </span>
                </>
              )}
              <span
                className={`uppercase ${
                  housemate.status === 'nominated'
                    ? 'text-red-500'
                    : housemate.status === 'evicted'
                    ? 'text-zinc-500'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {housemate.status}
              </span>
              {housemate.status === 'nominated' && typeof housemate.nominationPoints === 'number' && (
                <>
                  <span className="text-zinc-400" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono-tabular text-red-500">
                    2nd Nomination Points: {housemate.nominationPoints}
                  </span>
                </>
              )}
              {housemate.isImmune && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-white uppercase">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Ligtask Winner · Immune
                </span>
              )}
              <span className="text-zinc-400" aria-hidden="true">
                ·
              </span>
              <span className="text-zinc-600 dark:text-zinc-400">
                Entered Day {housemate.enteredDay}
              </span>
              {typeof housemate.age === 'number' && (
                <>
                  <span className="text-zinc-400" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Age {housemate.age}
                  </span>
                </>
              )}
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950 dark:text-white">
              {housemate.fullName}
            </h1>
            <p className="text-base font-medium text-amber-600 dark:text-amber-400">
              “{housemate.nickname}” — {housemate.tagline}
            </p>
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 pt-1">
              <MapPin className="h-4 w-4 text-zinc-400 shrink-0" />
              <span>{housemate.hometown}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
              Housemate Biography
            </h2>
            <p className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
              {housemate.biography}
            </p>
          </div>

          {activePoll && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  Featured in Active Community Fan Poll
                </p>
                <p className="font-display text-base font-bold text-zinc-950 dark:text-white">
                  {activePoll.title}
                </p>
              </div>
              <Link
                to="/voting"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
              >
                <Vote className="h-4 w-4" />
                Go to Fan Poll
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Other Housemates */}
      {others.length > 0 && (
        <section className="space-y-6 border-t border-zinc-200 dark:border-white/10 pt-10">
          <h2 className="font-display text-2xl font-bold text-zinc-950 dark:text-white">
            More Housemates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {others.map((other) => (
              <Link
                key={other.id}
                to={`/housemates/${other.slug}`}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-4 hover:border-amber-500/50 transition-colors"
              >
                <img
                  src={other.photoUrl}
                  alt={other.fullName}
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 rounded-lg object-cover shrink-0 bg-zinc-900"
                />
                <div className="min-w-0">
                  <p className="font-display text-base font-bold text-zinc-950 dark:text-white truncate">
                    {other.fullName}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    “{other.nickname}” · {other.hometown}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
