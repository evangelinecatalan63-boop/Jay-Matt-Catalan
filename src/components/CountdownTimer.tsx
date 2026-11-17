import React, { useEffect, useState } from 'react';

interface CountdownTimerProps {
  targetIso: string;
  label?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetIso, label }) => {
  const [remaining, setRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const compute = () => {
      const target = new Date(targetIso).getTime();
      const diff = target - Date.now();
      if (Number.isNaN(target) || diff <= 0) {
        setRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setRemaining({ days, hours, minutes, seconds, expired: false });
    };

    compute();
    const timer = window.setInterval(compute, 1000);
    return () => window.clearInterval(timer);
  }, [targetIso]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="inline-flex flex-col gap-1">
      {label && <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>}
      {remaining.expired ? (
        <span className="font-mono-tabular text-sm font-semibold text-red-500">
          Schedule Window Ended
        </span>
      ) : (
        <div className="inline-flex items-center gap-2 font-mono-tabular text-base sm:text-lg font-semibold text-zinc-950 dark:text-white">
          <span>{pad(remaining.days)}d</span>
          <span className="text-zinc-400 dark:text-zinc-600">:</span>
          <span>{pad(remaining.hours)}h</span>
          <span className="text-zinc-400 dark:text-zinc-600">:</span>
          <span>{pad(remaining.minutes)}m</span>
          <span className="text-zinc-400 dark:text-zinc-600">:</span>
          <span className="text-amber-600 dark:text-amber-400">{pad(remaining.seconds)}s</span>
        </div>
      )}
    </div>
  );
};
