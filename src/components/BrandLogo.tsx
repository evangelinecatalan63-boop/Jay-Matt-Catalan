import React from 'react';

interface BrandLogoProps {
  className?: string;
  showMark?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', showMark = true }) => {
  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      {showMark && (
        <img
          src="/assets/aistudio/pbb_d205f7c518_28f387a6.jpg"
          alt="Pinoy Big Brother 3.0 Logo"
          className="h-8 w-8 rounded-lg object-cover border border-sky-400/50 shadow-sm shadow-blue-900/40 shrink-0"
        />
      )}
      <span className="font-display text-sm sm:text-base lg:text-lg font-bold tracking-tight text-slate-950 dark:text-white whitespace-nowrap shrink-0">
        PINOY BIG BROTHER <span className="text-amber-500 dark:text-amber-400">3.0</span>
      </span>
    </span>
  );
};
