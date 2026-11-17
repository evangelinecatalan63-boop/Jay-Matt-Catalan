import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ open, onClose }) => {
  const { housemates, newsArticles, fanPolls, schedule } = useData();
  const [queryText, setQueryText] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      setQueryText('');
    }
  }, [open]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) onClose();
      } else if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) {
      return {
        housemates: housemates.slice(0, 4),
        articles: newsArticles.slice(0, 3),
        polls: fanPolls.slice(0, 2),
        events: schedule.slice(0, 2),
      };
    }

    return {
      housemates: housemates.filter(
        (h) =>
          h.fullName.toLowerCase().includes(q) ||
          h.nickname.toLowerCase().includes(q) ||
          h.hometown.toLowerCase().includes(q)
      ),
      articles: newsArticles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.excerpt.toLowerCase().includes(q)
      ),
      polls: fanPolls.filter((p) => p.title.toLowerCase().includes(q)),
      events: schedule.filter(
        (s) => s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
      ),
    };
  }, [queryText, housemates, newsArticles, fanPolls, schedule]);

  if (!open) return null;

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  const hasAny =
    results.housemates.length > 0 ||
    results.articles.length > 0 ||
    results.polls.length > 0 ||
    results.events.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search PINOY BIG BROTHER 3.0"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-sm p-4 pt-16 sm:pt-24"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-blue-200/80 dark:border-sky-400/20 bg-white dark:bg-[#08173A] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-white/10 px-4 py-3.5">
          <Search className="h-4 w-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search housemates, news updates, fan polls, or house events..."
            className="w-full bg-transparent text-sm text-zinc-950 dark:text-white placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4 space-y-5">
          {!hasAny && (
            <p className="py-8 text-center text-sm text-zinc-500">
              No matching housemates, articles, polls, or events found.
            </p>
          )}

          {results.housemates.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 mb-2 px-2">Housemates</h3>
              <div className="space-y-1">
                {results.housemates.map((hm) => (
                  <button
                    key={hm.id}
                    type="button"
                    onClick={() => go(`/housemates/${hm.slug}`)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={hm.photoUrl}
                        alt={hm.fullName}
                        referrerPolicy="no-referrer"
                        className="h-9 w-9 rounded-lg object-cover shrink-0 bg-zinc-900"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-zinc-950 dark:text-white truncate">
                          {hm.fullName} ({hm.nickname})
                        </div>
                        <div className="text-xs text-zinc-500 truncate">
                          {hm.hometown} · {hm.status}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.articles.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 mb-2 px-2">News &amp; Updates</h3>
              <div className="space-y-1">
                {results.articles.map((article) => (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() => go(`/news/${article.slug}`)}
                    className="block w-full rounded-lg px-3 py-2.5 text-left hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="text-sm font-medium text-zinc-950 dark:text-white truncate">
                      {article.title}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {article.source_name || 'PINOY BIG BROTHER 3.0'} · {article.category} ·{' '}
                      {new Date(article.published_at || article.publishedAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.polls.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 mb-2 px-2">Community Fan Polls</h3>
              <div className="space-y-1">
                {results.polls.map((poll) => (
                  <button
                    key={poll.id}
                    type="button"
                    onClick={() => go('/voting')}
                    className="block w-full rounded-lg px-3 py-2.5 text-left hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="text-sm font-medium text-zinc-950 dark:text-white truncate">
                      {poll.title}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      Status: {poll.status} · {poll.totalVotes.toLocaleString()} fan votes
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.events.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 mb-2 px-2">Livestream Schedule</h3>
              <div className="space-y-1">
                {results.events.map((evt) => (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => go('/live')}
                    className="block w-full rounded-lg px-3 py-2.5 text-left hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="text-sm font-medium text-zinc-950 dark:text-white truncate">
                      {evt.title}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {evt.startTime} · {evt.cameraLabel}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
