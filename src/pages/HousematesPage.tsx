import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShieldCheck } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { HousemateNetwork, HousemateStatus } from '../types/index.ts';

const STATUS_FILTERS: { key: 'all' | HousemateStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'nominated', label: 'Nominated' },
  { key: 'evicted', label: 'Evicted' },
  { key: 'guest', label: 'Guests' },
];

const NETWORK_FILTERS: { key: 'all' | 'Kapamilya' | 'Kapuso'; label: string }[] = [
  { key: 'all', label: 'All Networks' },
  { key: 'Kapamilya', label: 'Kapamilya' },
  { key: 'Kapuso', label: 'Kapuso' },
];

export const HousematesPage: React.FC = () => {
  const { housemates } = useData();
  const [statusFilter, setStatusFilter] = useState<'all' | HousemateStatus>('all');
  const [networkFilter, setNetworkFilter] = useState<'all' | 'Kapamilya' | 'Kapuso'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return housemates.filter((hm) => {
      const matchesStatus = statusFilter === 'all' || hm.status === statusFilter;
      const hmNetwork: HousemateNetwork | undefined = hm.network;
      const matchesNetwork = networkFilter === 'all' || hmNetwork === networkFilter;
      const matchesSearch =
        !q ||
        hm.fullName.toLowerCase().includes(q) ||
        hm.nickname.toLowerCase().includes(q) ||
        hm.hometown.toLowerCase().includes(q) ||
        (hm.network || '').toLowerCase().includes(q);
      return matchesStatus && matchesNetwork && matchesSearch;
    });
  }, [housemates, statusFilter, networkFilter, searchQuery]);

  const nominees = useMemo(
    () =>
      housemates
        .filter((h) => h.status === 'nominated')
        .sort((a, b) => (b.nominationPoints || 0) - (a.nominationPoints || 0)),
    [housemates]
  );

  const immuneHousemates = useMemo(
    () => housemates.filter((h) => Boolean(h.isImmune)),
    [housemates]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-white/10 pb-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            PBB Collab 3.0 · Season Directory
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950 dark:text-white">
            Housemates
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Complete PBB Collab 3.0 roster across Kapamilya, Kapuso, House Guests, and Evictees with current nomination and Ligtask standing.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by name, network, hometown..."
            className="w-full rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-[#08173A] pl-10 pr-4 py-2.5 text-sm text-zinc-950 dark:text-white placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Second Nomination Night Summary Strip */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-white/10 pb-3">
          <div>
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
              Second Nomination Night · November 15, 2026
            </p>
            <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
              6 Nominees Facing Eviction &amp; Ligtask Immunity Winners
            </h2>
          </div>
          <Link
            to="/voting"
            className="rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
          >
            Vote in Community Poll
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 space-y-1.5">
            <p className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Kapamilya Nominees (3)
            </p>
            <ul className="space-y-1 text-zinc-700 dark:text-zinc-300">
              {nominees
                .filter((n) => n.network === 'Kapamilya')
                .map((n) => (
                  <li key={n.id} className="flex items-center justify-between">
                    <Link to={`/housemates/${n.slug}`} className="font-medium hover:underline">
                      {n.fullName}
                    </Link>
                    <span className="font-mono-tabular font-bold text-red-500">
                      {n.nominationPoints ?? 0} pts
                    </span>
                  </li>
                ))}
            </ul>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 space-y-1.5">
            <p className="font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
              Kapuso Nominees (3)
            </p>
            <ul className="space-y-1 text-zinc-700 dark:text-zinc-300">
              {nominees
                .filter((n) => n.network === 'Kapuso')
                .map((n) => (
                  <li key={n.id} className="flex items-center justify-between">
                    <Link to={`/housemates/${n.slug}`} className="font-medium hover:underline">
                      {n.fullName}
                    </Link>
                    <span className="font-mono-tabular font-bold text-red-500">
                      {n.nominationPoints ?? 0} pts
                    </span>
                  </li>
                ))}
            </ul>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-1.5">
            <p className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Ligtask Winners (Immune)
            </p>
            <ul className="space-y-1 text-zinc-700 dark:text-zinc-300">
              {immuneHousemates.map((im) => (
                <li key={im.id} className="flex items-center justify-between">
                  <Link to={`/housemates/${im.slug}`} className="font-medium hover:underline">
                    {im.fullName}
                  </Link>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {im.network || 'Immune'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Filter Segmented Bars */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-zinc-950 dark:bg-amber-500 text-white dark:text-zinc-950'
                  : 'border border-zinc-300 dark:border-white/10 bg-white dark:bg-[#08173A] text-zinc-700 dark:text-zinc-300 hover:border-amber-500/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {NETWORK_FILTERS.map((net) => (
            <button
              key={net.key}
              type="button"
              onClick={() => setNetworkFilter(net.key)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                networkFilter === net.key
                  ? net.key === 'Kapamilya'
                    ? 'bg-blue-600 text-white'
                    : net.key === 'Kapuso'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950'
                  : 'border border-zinc-300 dark:border-white/10 bg-white dark:bg-[#08173A] text-zinc-700 dark:text-zinc-300 hover:border-amber-500/50'
              }`}
            >
              {net.label}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-12 text-center space-y-2">
          <p className="text-sm font-medium text-zinc-900 dark:text-white">
            No housemates match your filter
          </p>
          <p className="text-xs text-zinc-500">
            Try clearing your search input or switching to All status and networks.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((hm) => (
            <Link
              key={hm.id}
              to={`/housemates/${hm.slug}`}
              className="group overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
                <img
                  src={hm.photoUrl}
                  alt={hm.fullName}
                  referrerPolicy="no-referrer"
                  className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
                    hm.status === 'evicted' ? 'grayscale opacity-80' : ''
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

                {(hm.network || hm.isImmune) && (
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 text-[11px] font-bold">
                    {hm.network && (
                      <span
                        className={`rounded-md px-2 py-0.5 uppercase tracking-wide ${
                          hm.network === 'Kapamilya'
                            ? 'bg-blue-600/90 text-white'
                            : hm.network === 'Kapuso'
                            ? 'bg-red-600/90 text-white'
                            : 'bg-zinc-900/85 text-zinc-200'
                        }`}
                      >
                        {hm.network}
                      </span>
                    )}
                    {hm.isImmune && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/90 px-2 py-0.5 uppercase text-white">
                        <ShieldCheck className="h-3 w-3" />
                        Ligtask Immune
                      </span>
                    )}
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 p-4 space-y-1">
                  <div className="text-xs text-zinc-300 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`capitalize font-semibold ${
                        hm.status === 'nominated'
                          ? 'text-red-400'
                          : hm.status === 'evicted'
                          ? 'text-zinc-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {hm.status}
                    </span>
                    {hm.status === 'nominated' && typeof hm.nominationPoints === 'number' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular font-bold text-red-300">
                          {hm.nominationPoints} pts
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>Day {hm.enteredDay}</span>
                  </div>
                  <h2 className="font-display text-lg font-bold text-white truncate">
                    {hm.fullName}
                  </h2>
                  <p className="text-xs text-zinc-300 truncate">
                    “{hm.nickname}” · {hm.hometown}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

