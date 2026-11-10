import React from 'react';

export type BadgeVariant =
  | 'Critical'
  | 'Warning'
  | 'Watch'
  | 'Low'
  | 'Moderate'
  | 'High'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'voice_completed'
  | 'voice-call completed'
  | 'draft'
  | 'published'
  | 'cancelled'
  | 'open'
  | 'caution'
  | 'partial'
  | 'blocked'
  | 'submitted'
  | 'under_review'
  | 'verified'
  | 'unavailable'
  | string;

export interface StatusBadgeProps {
  status: BadgeVariant;
  label?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showDot?: boolean;
  pulse?: boolean;
  className?: string;
}

const BADGE_CONFIG: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    dot: string;
    ping?: string;
    defaultLabel: string;
    icon?: string;
  }
> = {
  // Severities
  critical: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-600',
    ping: 'bg-red-400',
    defaultLabel: 'Critical',
    icon: '🔴',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    ping: 'bg-amber-400',
    defaultLabel: 'Warning',
    icon: '🟡',
  },
  watch: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
    defaultLabel: 'Watch',
    icon: '⚡',
  },
  high: {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    defaultLabel: 'High Risk',
  },
  moderate: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    defaultLabel: 'Moderate',
  },
  low: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    defaultLabel: 'Low Risk',
  },

  // Alert Lifecycle & Delivery Statuses
  published: {
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
    dot: 'bg-teal-600',
    defaultLabel: 'Published',
  },
  sent: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dot: 'bg-blue-600',
    ping: 'bg-blue-400',
    defaultLabel: 'Sent',
  },
  delivered: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-600',
    defaultLabel: 'Delivered',
  },
  'voice-call completed': {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dot: 'bg-purple-600',
    defaultLabel: 'Voice Call Completed',
    icon: '📞',
  },
  voice_completed: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dot: 'bg-purple-600',
    defaultLabel: 'Voice Call Completed',
    icon: '📞',
  },
  failed: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-600',
    defaultLabel: 'Delivery Failed',
  },
  draft: {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    defaultLabel: 'Draft',
  },
  cancelled: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
    defaultLabel: 'Cancelled',
  },
  unavailable: {
    bg: 'bg-amber-50/70',
    text: 'text-amber-900',
    border: 'border-amber-300/80',
    dot: 'bg-amber-500',
    defaultLabel: 'Gateway Unavailable',
  },

  // Road/Transit Statuses
  open: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-600',
    defaultLabel: 'Open to Traffic',
  },
  blocked: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-600',
    ping: 'bg-red-400',
    defaultLabel: 'Blocked Corridor',
  },
  caution: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    defaultLabel: 'Caution / Slow',
  },
  partial: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    defaultLabel: 'Partial Clearance',
  },

  // Reports
  submitted: {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
    defaultLabel: 'Submitted',
  },
  under_review: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    defaultLabel: 'Under Review',
  },
  verified: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-600',
    defaultLabel: 'Verified',
  },
};

export default function StatusBadge({
  status,
  label,
  size = 'md',
  showDot = true,
  pulse,
  className = '',
}: StatusBadgeProps) {
  const normalizedKey = (status || '').toLowerCase().trim();
  const config = BADGE_CONFIG[normalizedKey] || {
    bg: 'bg-[#173D32]/5',
    text: 'text-[#173D32]',
    border: 'border-[#173D32]/15',
    dot: 'bg-[#173D32]/60',
    defaultLabel: status || 'Unknown',
  };

  const displayLabel = label || config.defaultLabel;
  const isPulseActive = pulse !== undefined ? pulse : !!config.ping;

  const sizeClasses = {
    xs: 'text-[10px] px-2 py-0.5 gap-1',
    sm: 'text-xs px-2.5 py-0.5 gap-1.5',
    md: 'text-xs px-3 py-1 gap-1.5 font-bold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  }[size];

  const dotSize = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-colors select-none ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span className="relative flex shrink-0">
          {isPulseActive && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                config.ping || config.dot
              }`}
            />
          )}
          <span className={`relative inline-flex rounded-full ${config.dot} ${dotSize}`} />
        </span>
      )}
      <span className="truncate">{displayLabel}</span>
    </span>
  );
}
