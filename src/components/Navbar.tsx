import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { BrandLogo } from './BrandLogo.tsx';

interface NavbarProps {
  onOpenSearch: () => void;
}

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/live', label: 'Live' },
  { to: '/voting', label: 'Voting' },
  { to: '/housemates', label: 'Housemates' },
  { to: '/news', label: 'News' },
];

export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch }) => {
  const { user, profile, isAdmin, openAuthModal } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-blue-200/80 dark:border-sky-400/15 bg-white/88 dark:bg-[#040D24]/88 backdrop-blur-xl">
      <div className="h-0.5 w-full pbb-tricolor-line" aria-hidden="true" />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <Link
          to="/"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-md whitespace-nowrap shrink-0"
        >
          <BrandLogo />
        </Link>

        {/* Zone 2: 5 concise single-line nav links */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `relative py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 inline-flex items-center gap-1.5 ${
                  isActive
                    ? 'text-[#0E5CD6] dark:text-white after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:bg-gradient-to-r after:from-[#0E5CD6] after:via-[#F5B727] after:to-[#D91E2A]'
                    : 'text-slate-600 dark:text-sky-100/75 hover:text-[#0E5CD6] dark:hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3: Single Primary Action + Mobile Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <Link
              to={isAdmin ? '/admin' : '/profile'}
              className="hidden md:inline-flex items-center justify-center rounded-lg bg-[#0E5CD6] dark:bg-amber-400 px-4 py-2 text-xs font-bold text-white dark:text-[#040D24] hover:bg-[#1565E8] dark:hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-blue-900/20"
            >
              {isAdmin ? 'Admin Console' : profile?.displayName?.split(' ')[0] || 'Account'}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('signin')}
              className="hidden md:inline-flex items-center justify-center rounded-lg bg-[#0E5CD6] dark:bg-amber-400 px-4 py-2 text-xs font-bold text-white dark:text-[#040D24] hover:bg-[#1565E8] dark:hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm shadow-blue-900/20"
            >
              Sign In
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="inline-flex md:hidden items-center justify-center h-11 w-11 rounded-lg border border-blue-200 dark:border-sky-400/20 text-slate-800 dark:text-sky-100 hover:bg-blue-50 dark:hover:bg-sky-500/10 transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-blue-200 dark:border-sky-400/15 bg-white dark:bg-[#06122E] px-4 py-4 space-y-2">
          <nav aria-label="Mobile Navigation" className="flex flex-col space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#0E5CD6]/15 text-[#0E5CD6] dark:bg-sky-500/15 dark:text-amber-300'
                      : 'text-slate-700 dark:text-sky-100/80 hover:bg-blue-50 dark:hover:bg-white/5'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenSearch();
              }}
              className="px-3 py-3 rounded-lg text-left text-sm font-medium text-slate-700 dark:text-sky-100/80 hover:bg-blue-50 dark:hover:bg-white/5 cursor-pointer"
            >
              Search Hub
            </button>
            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-3 rounded-lg text-sm font-medium text-slate-700 dark:text-sky-100/80 hover:bg-blue-50 dark:hover:bg-white/5"
                >
                  My Profile
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-3 rounded-lg text-sm font-semibold text-amber-600 dark:text-amber-300 hover:bg-amber-500/10"
                  >
                    Admin Dashboard
                  </Link>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  openAuthModal('signin');
                }}
                className="mt-2 w-full rounded-lg bg-amber-400 px-4 py-3 text-sm font-bold text-[#040D24] hover:bg-amber-300 transition-colors cursor-pointer"
              >
                Sign In / Register
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
