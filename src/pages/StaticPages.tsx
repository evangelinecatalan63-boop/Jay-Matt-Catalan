import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronDown, Mail } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';

export const ContactPage: React.FC = () => {
  const { siteSettings } = useData();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setReferenceId(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to send inquiry.');
      }
      setReferenceId(json.referenceId);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
      <div className="space-y-3 border-b border-zinc-200 dark:border-white/10 pb-6">
        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
          Community Support
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950 dark:text-white">
          Contact PINOY BIG BROTHER 3.0
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
          Send press questions, livestream link corrections, or community feedback directly to our editorial team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-4 space-y-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-5 space-y-3">
            <Mail className="h-5 w-5 text-amber-500" />
            <h2 className="font-display text-base font-bold text-zinc-950 dark:text-white">
              Direct Email
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 break-all">
              {siteSettings.contactEmail}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="md:col-span-8 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4"
        >
          {referenceId && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-2.5 text-sm text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Message received. Reference ID: <strong className="font-mono-tabular">{referenceId}</strong>
              </span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-800 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-name" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Your Name
              </label>
              <input
                id="contact-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-950 dark:text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Email Address
              </label>
              <input
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-950 dark:text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="contact-subject" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Subject
            </label>
            <input
              id="contact-subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-950 dark:text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="contact-message" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Message
            </label>
            <textarea
              id="contact-message"
              rows={5}
              required
              minLength={10}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-950 dark:text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {submitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
};

const FAQS = [
  {
    q: 'Are the fan polls on PINOY BIG BROTHER 3.0 official Pinoy Big Brother votes?',
    a: 'No. All polls hosted on PINOY BIG BROTHER 3.0 are strictly unofficial community fan polls for fan sentiment and discussion. Official eviction and Big Winner voting takes place exclusively through the official broadcast network channels.',
  },
  {
    q: 'Why does the livestream player show an offline or unavailable screen sometimes?',
    a: 'PINOY BIG BROTHER 3.0 never scrapes, bypasses, or redistributes restricted feeds. When authorized official broadcast streams are outside their scheduled window or offline, the player automatically displays an offline status and upcoming broadcast schedule.',
  },
  {
    q: 'How are community fan polls protected against spam voting?',
    a: 'Each poll requires a signed-in verified account, enforces a one-vote-per-poll database constraint, and validates requests through server-side rate-limiting and token verification.',
  },
  {
    q: 'How do administrators manage housemates, polls, and maintenance mode?',
    a: 'Authorized administrators sign in and access the Admin Dashboard to add or edit housemates, schedule fan polls, update authorized livestream feeds, publish news articles, and toggle maintenance mode.',
  },
];

export const FaqPage: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-8">
      <div className="space-y-2 border-b border-zinc-200 dark:border-white/10 pb-6">
        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Help Center</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950 dark:text-white">
          Frequently Asked Questions
        </h1>
      </div>

      <div className="divide-y divide-zinc-200 dark:divide-white/10 border-b border-zinc-200 dark:border-white/10">
        {FAQS.map((item, idx) => {
          const open = openIdx === idx;
          return (
            <div key={item.q} className="py-5">
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : idx)}
                className="flex w-full items-center justify-between gap-4 text-left cursor-pointer"
              >
                <span className="font-display text-base sm:text-lg font-semibold text-zinc-950 dark:text-white">
                  {item.q}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
                    open ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {open && (
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PrivacyPage: React.FC = () => (
  <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-6">
    <div className="border-b border-zinc-200 dark:border-white/10 pb-6 space-y-2">
      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Legal</p>
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950 dark:text-white">
        Privacy Policy
      </h1>
    </div>
    <div className="space-y-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
      <p>
        PINOY BIG BROTHER 3.0 collects only the account information needed to authenticate your session, save your profile preferences, and prevent duplicate votes in community fan polls.
      </p>
      <p>
        User profile documents—including email addresses and vote records—are restricted by database security rules so other public visitors cannot view your personal email or individual voting history.
      </p>
      <p>
        Session identifiers used for aggregate visitor statistics do not store personally identifiable tracking profiles. To request account updates or removal, contact our team via the Contact page.
      </p>
    </div>
  </div>
);

export const TermsPage: React.FC = () => (
  <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-6">
    <div className="border-b border-zinc-200 dark:border-white/10 pb-6 space-y-2">
      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Legal</p>
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950 dark:text-white">
        Terms &amp; Conditions
      </h1>
    </div>
    <div className="space-y-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
      <p>
        PINOY BIG BROTHER 3.0 is an independent, fan-inspired reality-TV hub created with original branding and editorial commentary. It is not officially affiliated with or endorsed by Pinoy Big Brother, ABS-CBN, or GMA Network unless explicitly stated on an authorized broadcast embed.
      </p>
      <p>
        All polls hosted on this platform are unofficial community polls for entertainment purposes. Automated vote scripting, account spoofing, or attempts to bypass poll rate limits are prohibited.
      </p>
      <p>
        Livestream players strictly link or embed authorized official feeds provided by administrators. No copyrighted streams are scraped or redistributed.
      </p>
    </div>
  </div>
);

export const NotFoundPage: React.FC = () => (
  <div className="mx-auto max-w-2xl px-4 py-24 text-center space-y-5">
    <p className="font-mono-tabular text-sm font-bold text-amber-500">404</p>
    <h1 className="font-display text-3xl sm:text-5xl font-bold text-zinc-950 dark:text-white">
      Page Outside the House
    </h1>
    <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
      The page you requested does not exist or may have moved to a new room.
    </p>
    <div className="pt-2">
      <Link
        to="/"
        className="inline-flex rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-amber-400 transition-colors"
      >
        Return to Home
      </Link>
    </div>
  </div>
);
