import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface FeatureCardProps {
  key?: React.Key;
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-[#F9DBBD] border border-[#f0c39c] hover:border-[#A53860] rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between group shadow-sm hover:shadow-md">
      <div className="space-y-4">
        {/* 40x40px rounded-xl icon container */}
        <div className="w-[40px] h-[40px] rounded-xl bg-[#F5EBE0] border border-[#f0c39c] flex items-center justify-center shrink-0 transition-colors group-hover:border-[#A53860]">
          <Icon className="w-5 h-5 text-[#A53860] stroke-[2]" />
        </div>
        
        {/* Feature Title: Serif, 600 weight, #450920 text */}
        <h3 className="font-serif italic font-bold text-[#450920] text-[18px] leading-snug">
          {title}
        </h3>
        
        {/* Feature Body Text: Sans-serif, 14px, #450920 text */}
        <p className="font-sans text-[13px] text-[#450920] font-medium leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

export interface FeatureGridProps {
  features: FeatureItem[];
  title?: string;
  subtitle?: string;
}

export function FeatureGrid({ features, title, subtitle }: FeatureGridProps) {
  return (
    <div className="w-full space-y-6">
      {(title || subtitle) && (
        <div className="space-y-1 mb-6">
          {subtitle && (
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#A53860] font-bold">
              {subtitle}
            </span>
          )}
          {title && (
            <h2 className="text-xl sm:text-2xl font-serif text-[#450920] font-bold">
              {title}
            </h2>
          )}
        </div>
      )}
      
      {/* 4 columns desktop, 2 tablet, 1 mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map((feature, idx) => (
          <FeatureCard
            key={feature.title || idx}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>
    </div>
  );
}

export default FeatureCard;
