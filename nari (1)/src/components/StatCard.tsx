import React from 'react';

export interface StatItem {
  number: string;
  label: string;
}

export interface StatCardProps {
  key?: React.Key;
  number: string;
  label: string;
}

export function StatCard({ number, label }: StatCardProps) {
  return (
    <div className="bg-[#F9DBBD] border border-[#f0c39c] hover:border-[#A53860] rounded-2xl p-6 text-center transition-all duration-200 shadow-sm flex flex-col justify-center items-center group">
      {/* Stat Number: Serif font, ~38px, color #A53860 */}
      <div className="font-serif font-bold text-[38px] text-[#A53860] transition-colors leading-none mb-2.5 tracking-tight">
        {number}
      </div>
      
      {/* Stat Label: Monospace font, uppercase, wide letter spacing, small, color #450920 */}
      <div className="font-mono uppercase tracking-wider text-[11px] text-[#450920] font-bold leading-snug">
        {label}
      </div>
    </div>
  );
}

export interface StatGridProps {
  stats: StatItem[];
  title?: string;
}

export function StatGrid({ stats, title }: StatGridProps) {
  return (
    <div className="w-full space-y-5">
      {title && (
        <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#A53860] font-bold mb-4 text-center">
          {title}
        </h3>
      )}
      
      {/* 4 columns desktop, 2 tablet, 1 mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => (
          <StatCard
            key={stat.label || idx}
            number={stat.number}
            label={stat.label}
          />
        ))}
      </div>
    </div>
  );
}

export default StatCard;
