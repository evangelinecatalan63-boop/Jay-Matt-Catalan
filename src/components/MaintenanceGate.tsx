import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Shield, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { BrandLogo } from './BrandLogo.tsx';

export const MaintenanceGate: React.FC = () => {
  const { user, isAdmin, openAuthModal } = useAuth();
  const { siteSettings } = useData();

  return (
    <div className="min-h-screen bg-[#030B1D] text-slate-100 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Subtle cosmic studio light gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(14,92,214,0.22),transparent_60%)]"
      />

      <div className="relative z-10 w-full max-w-xl text-center space-y-8">
        <div className="flex justify-center">
          <BrandLogo />
        </div>

        {/* Compositor-only maintenance orbital animation */}
        <div className="mx-auto relative h-32 w-32 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border border-sky-400/35 border-t-amber-400"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-3 rounded-full border border-red-500/25 border-b-red-500"
          />
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            className="h-12 w-12 rounded-xl bg-[#08173A] border border-amber-400/45 flex items-center justify-center"
          >
            <div className="h-3.5 w-3.5 rounded-full bg-amber-400" />
          </motion.div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-medium tracking-widest text-amber-400">
            Scheduled Platform Maintenance
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white">
            {siteSettings.maintenanceMessage || "WE'LL BE BACK SOON!"}
          </h1>
          <p className="text-base text-zinc-400 leading-relaxed max-w-md mx-auto">
            The House hub is undergoing routine updates to improve livestream reliability, fan poll security, and page speed.
          </p>
        </div>

        {siteSettings.maintenanceReturnTime && (
          <div className="inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-zinc-200">
            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{siteSettings.maintenanceReturnTime}</span>
          </div>
        )}

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          {isAdmin ? (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition-colors"
            >
              <Shield className="h-4 w-4" />
              Enter Admin Dashboard
            </Link>
          ) : user ? (
            <p className="text-xs text-zinc-500">
              Signed in as {user.email}. Public access will resume automatically once maintenance ends.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('signin')}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Shield className="h-4 w-4 text-amber-400" />
              Administrator Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
