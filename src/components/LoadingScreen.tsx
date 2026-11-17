import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface LoadingScreenProps {
  isReady?: boolean;
}

const PBB_LOGO_SRC = '/assets/aistudio/pbb_d205f7c518_28f387a6.jpg';

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isReady = false }) => {
  const [logoError, setLogoError] = useState(false);
  const [progress, setProgress] = useState(0.18);

  useEffect(() => {
    if (isReady) {
      setProgress(1);
      return;
    }

    const t1 = window.setTimeout(() => setProgress((p) => Math.max(p, 0.46)), 180);
    const t2 = window.setTimeout(() => setProgress((p) => Math.max(p, 0.72)), 480);
    const t3 = window.setTimeout(() => setProgress((p) => Math.max(p, 0.86)), 1100);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [isReady]);

  return (
    <motion.div
      key="pbb-entrance-loader"
      role="status"
      aria-live="polite"
      aria-busy={!isReady}
      aria-label="Loading PINOY BIG BROTHER 3.0"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.015 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden pbb-cosmic-shell px-6 select-none"
    >
      {/* Top tricolor broadcast bar aligned with Navbar */}
      <div className="fixed top-0 inset-x-0 h-0.5 pbb-tricolor-line" aria-hidden="true" />

      {/* Subtle centered studio aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(14,92,214,0.16),transparent_58%)] dark:bg-[radial-gradient(circle_at_50%_46%,rgba(14,92,214,0.28),transparent_56%)]"
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center text-center max-w-md w-full space-y-8"
      >
        {/* PBB Eye Emblem with Concentric Tricolor Orbital Rings */}
        <div className="relative h-36 w-36 sm:h-40 sm:w-40 flex items-center justify-center">
          {/* Outer Cobalt & Sky Orbit */}
          <motion.div
            aria-hidden="true"
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-2 border-blue-500/20 dark:border-sky-400/20 border-t-[#0E5CD6] dark:border-t-sky-400 border-r-amber-400/80"
          />

          {/* Middle Gold & Crimson Counter-Orbit */}
          <motion.div
            aria-hidden="true"
            animate={{ rotate: -360 }}
            transition={{ duration: 6.5, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-3 rounded-full border-2 border-amber-500/15 dark:border-amber-400/15 border-b-[#D91E2A] border-l-amber-400"
          />

          {/* Subtle Breathing Halo */}
          <motion.div
            aria-hidden="true"
            animate={{ scale: [0.96, 1.04, 0.96], opacity: [0.45, 0.85, 0.45] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-5 rounded-full bg-gradient-to-tr from-[#0E5CD6]/20 via-amber-400/20 to-[#D91E2A]/20 blur-md"
          />

          {/* Center Medallion */}
          <div className="relative h-24 w-24 sm:h-26 sm:w-26 rounded-full overflow-hidden border-2 border-amber-400/80 bg-[#040D24] shadow-2xl shadow-blue-950/50 flex items-center justify-center">
            {!logoError ? (
              <img
                src={PBB_LOGO_SRC}
                alt="PINOY BIG BROTHER 3.0 Emblem"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-display text-xl font-extrabold tracking-tight text-white">
                PBB <span className="text-amber-400">3.0</span>
              </span>
            )}
          </div>
        </div>

        {/* Brand Title & Honest Stage Description */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold tracking-wider text-[#0E5CD6] dark:text-amber-400">
            PBB Collab 3.0 · Official Hub
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            PINOY BIG BROTHER{' '}
            <span className="text-amber-500 dark:text-amber-400">3.0</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-sky-100/75 min-h-[1.25rem]">
            {isReady
              ? 'Welcome inside the Big Brother House'
              : 'Loading housemates, fan polls & 24/7 streams...'}
          </p>
        </div>

        {/* Compositor-Only Tricolor Progress Sweep */}
        <div className="w-60 sm:w-72 space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-950/10 dark:bg-white/10">
            <motion.div
              aria-hidden="true"
              initial={{ scaleX: 0.12 }}
              animate={{ scaleX: progress }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="h-full w-full origin-left rounded-full pbb-tricolor-line"
            />
          </div>
          <p className="font-mono-tabular text-[11px] font-medium text-slate-500 dark:text-sky-200/60">
            {Math.round(progress * 100)}%
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
