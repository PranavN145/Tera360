import React from 'react';

export interface SectionHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  compact?: boolean;
  borderBottom?: boolean;
}

export default function SectionHeader({
  title,
  subtitle,
  badge,
  icon,
  actions,
  className = '',
  compact = false,
  borderBottom = true,
}: SectionHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        borderBottom ? 'pb-3.5 mb-4 border-b border-[#173D32]/10' : 'mb-3'
      } ${className}`}
    >
      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
        {icon && (
          <div className="shrink-0 p-2 rounded-xl bg-[#173D32]/5 text-[#173D32] flex items-center justify-center text-lg">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`${
                compact ? 'text-sm font-extrabold' : 'text-base sm:text-lg font-extrabold'
              } text-[#173D32] tracking-tight leading-snug`}
            >
              {title}
            </h3>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <p
              className={`${
                compact ? 'text-[11px]' : 'text-xs'
              } text-[#173D32]/70 mt-0.5 font-normal leading-relaxed`}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
