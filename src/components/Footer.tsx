import React from 'react';
import { Link } from 'react-router-dom';
import { Moon, Search, Shield, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { BrandLogo } from './BrandLogo.tsx';

interface FooterProps {
  onOpenSearch: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSearch }) => {
  const { user, isAdmin, theme, toggleTheme, openAuthModal } = useAuth();
  const { siteSettings } = useData();

  return (
    <footer className="border-t border-blue-200/80 dark:border-sky-400/15 bg-[#E9F1FE] dark:bg-[#020817] text-slate-600 dark:text-sky-100/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <BrandLogo />
            <p className="text-sm leading-relaxed text-slate-600 dark:text-sky-100/70 max-w-xs">
              {siteSettings.tagline}
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onOpenSearch}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 dark:border-sky-400/20 bg-white dark:bg-[#08173A] px-3 py-2 text-xs font-medium text-slate-800 dark:text-sky-100 hover:border-amber-400/60 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Search className="h-3.5 w-3.5" />
                Search
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle color theme"
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 dark:border-sky-400/20 bg-white dark:bg-[#08173A] px-3 py-2 text-xs font-medium text-slate-800 dark:text-sky-100 hover:border-amber-400/60 transition-colors cursor-pointer whitespace-nowrap"
              >
                {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-slate-950 dark:text-white mb-4">
              Explore Hub
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/live" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Live All Access
                </Link>
              </li>
              <li>
                <Link to="/voting" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Community Fan Polls
                </Link>
              </li>
              <li>
                <Link to="/housemates" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Housemates Directory
                </Link>
              </li>
              <li>
                <Link to="/news" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  News &amp; Updates
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-zinc-950 dark:text-white mb-4">
              Information &amp; Support
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/faq" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                {user ? (
                  <Link to="/profile" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                    Account Settings
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAuthModal('signin')}
                    className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    Sign In / Register
                  </button>
                )}
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-zinc-950 dark:text-white mb-4">
              Connect &amp; Contact
            </h3>
            <p className="text-sm mb-3">
              <a
                href={`mailto:${siteSettings.contactEmail}`}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                {siteSettings.contactEmail}
              </a>
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm mb-5">
              {siteSettings.socialLinks?.youtube && (
                <a
                  href={siteSettings.socialLinks.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  YouTube
                </a>
              )}
              {siteSettings.socialLinks?.facebook && (
                <a
                  href={siteSettings.socialLinks.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  Facebook
                </a>
              )}
              {siteSettings.socialLinks?.x && (
                <a
                  href={siteSettings.socialLinks.x}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  X
                </a>
              )}
              {siteSettings.socialLinks?.instagram && (
                <a
                  href={siteSettings.socialLinks.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  Instagram
                </a>
              )}
              {siteSettings.socialLinks?.tiktok && (
                <a
                  href={siteSettings.socialLinks.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  TikTok
                </a>
              )}
            </div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-amber-500 transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
              {isAdmin ? 'Open Admin Dashboard' : 'Administrator Access'}
            </Link>
          </div>
        </div>

        <div className="mt-12 border-t border-zinc-200 dark:border-white/10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-500">
          <p>
            © {new Date().getFullYear()} {siteSettings.siteName}. Original fan hub inspired by Pinoy reality television.
          </p>
          <p>
            Independent PBB ALL ACCESS fan poll — not affiliated with or endorsed by the official Pinoy Big Brother organization.
          </p>
        </div>
      </div>
    </footer>
  );
};
