'use client';

import React, { useId } from 'react';

interface AlertSectionBannerProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  showPineTrees?: boolean;
}

/**
 * Shared Terra360 alert workspace banner featuring warm cream surface,
 * subtle misty hillside silhouette artwork, and clean header hierarchy.
 */
export default function AlertSectionBanner({
  icon,
  title,
  subtitle,
  badge,
  actions,
  showPineTrees = false,
}: AlertSectionBannerProps) {
  const uid = useId().replace(/:/g, '');
  const backGradId = `hill-back-${uid}`;
  const midGradId = `hill-mid-${uid}`;
  const frontGradId = `hill-front-${uid}`;

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#FAF8F2] border border-[#173D32]/12 px-5 py-4 sm:px-6 sm:py-5 shadow-2xs">
      <svg
        viewBox="0 0 420 120"
        preserveAspectRatio="xMaxYMax slice"
        aria-hidden="true"
        className="pointer-events-none select-none hidden sm:block absolute right-0 bottom-0 h-full w-[380px] opacity-80"
      >
        <defs>
          <linearGradient id={backGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DCE8D4" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#89A990" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id={midGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C8DAC0" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#5C8267" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id={frontGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#466F54" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#173D32" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path d="M 40 120 Q 130 48, 220 75 T 420 32 L 420 120 Z" fill={`url(#${backGradId})`} />
        <path d="M 110 120 Q 210 64, 300 84 T 420 55 L 420 120 Z" fill={`url(#${midGradId})`} />
        <path d="M 200 120 Q 290 88, 360 95 L 420 82 L 420 120 Z" fill={`url(#${frontGradId})`} />
        {showPineTrees && (
          <g fill="#173D32" fillOpacity="0.58">
            <polygon points="354,100 361,72 368,100" />
            <polygon points="356,86 361,64 366,86" />
            <polygon points="370,104 378,68 386,104" />
            <polygon points="372,85 378,58 384,85" />
            <polygon points="388,106 394,78 400,106" />
            <polygon points="401,105 408,70 415,105" />
            <polygon points="403,86 408,60 413,86" />
          </g>
        )}
      </svg>

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="w-11 h-11 rounded-2xl bg-[#EAF0E6] border border-[#173D32]/12 flex items-center justify-center shrink-0 text-[#173D32] shadow-2xs"
            aria-hidden="true"
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-2xl font-extrabold text-[#173D32] tracking-tight leading-tight">
                {title}
              </h2>
              {badge}
            </div>
            <p className="text-xs sm:text-[13px] text-[#173D32]/70 mt-0.5 leading-snug">
              {subtitle}
            </p>
          </div>
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
