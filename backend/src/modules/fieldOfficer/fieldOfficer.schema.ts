/**
 * Terra360 Field Officer Portal - Input Validation Schemas
 * Comprehensive Zod schemas for request validation.
 */

import { z } from 'zod';

export const VALID_ROAD_CONDITIONS = ['Open', 'Caution', 'Partially Blocked', 'Blocked'] as const;
export const VALID_TASK_ACTIONS = ['start', 'complete', 'escalate'] as const;
export const VALID_REPORT_ACTIONS = ['verify', 'reject', 'escalate'] as const;
export const VALID_TASK_RISK_LEVELS = ['Low', 'Moderate', 'High', 'Critical'] as const;
export const VALID_TASK_STATUSES = ['Assigned', 'In_Progress', 'Completed', 'Escalated'] as const;
export const VALID_ALERT_SEVERITIES = ['Advisory', 'Warning', 'Critical'] as const;

// ── Profile Language Schema ─────────────────────────────────────────────────
export const updateLanguageSchema = z.object({
  language: z
    .string()
    .trim()
    .min(2, 'Language code must be at least 2 characters (e.g. en, hi, ao)')
    .max(10, 'Language code cannot exceed 10 characters'),
});

// ── Task Lifecycle Schemas ──────────────────────────────────────────────────
export const taskParamsSchema = z.object({
  id: z.string().trim().min(1, 'Task ID parameter is required'),
});

export const completeTaskSchema = z.object({
  completionNotes: z
    .string()
    .trim()
    .max(2000, 'Completion notes cannot exceed 2000 characters')
    .optional(),
  completionPhotoUrl: z.string().trim().url('Completion photo must be a valid URL').optional(),
});

export const escalateTaskSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, 'Escalation reason is required and must contain at least 5 characters')
    .max(2000, 'Escalation reason cannot exceed 2000 characters'),
  priority: z
    .enum(['Moderate', 'High', 'Critical'])
    .default('Critical')
    .optional(),
});

// ── Villager Reports Schemas ────────────────────────────────────────────────
export const reportParamsSchema = z.object({
  id: z.string().trim().min(1, 'Report ID parameter is required'),
});

export const verifyReportSchema = z.object({
  fieldNotes: z
    .string()
    .trim()
    .max(2000, 'Field notes cannot exceed 2000 characters')
    .optional(),
  inspectorPhotoUrl: z.string().trim().url('Inspector photo must be a valid URL').optional(),
});

export const rejectReportSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(5, 'Rejection reason is required (minimum 5 characters) explaining why report was rejected')
    .max(1000, 'Rejection reason cannot exceed 1000 characters'),
});

export const escalateReportSchema = z.object({
  urgency: z.enum(['Immediate', 'High', 'Critical']).default('Immediate'),
  escalationReason: z
    .string()
    .trim()
    .min(5, 'Escalation reason is required (minimum 5 characters)')
    .max(2000, 'Escalation reason cannot exceed 2000 characters'),
  recommendedAction: z
    .string()
    .trim()
    .max(1000, 'Recommended action cannot exceed 1000 characters')
    .optional(),
});

// ── Road Status Update Schema ───────────────────────────────────────────────
export const updateRoadStatusSchema = z
  .object({
    roadSegmentId: z.string().trim().max(100).optional(),
    stretchName: z.string().trim().max(200).optional(),
    condition: z.enum(VALID_ROAD_CONDITIONS, {
      message: `Condition must strictly be one of: ${VALID_ROAD_CONDITIONS.join(', ')}`,
    }),
    reason: z
      .string()
      .trim()
      .min(3, 'Reason describing road status is required (minimum 3 characters)')
      .max(1000, 'Reason cannot exceed 1000 characters'),
    photoUrl: z.string().trim().url('Photo URL must be a valid URL').nullable().optional(),
    timestamp: z.string().datetime({ offset: true }).optional().or(z.string().datetime().optional()),
  })
  .refine(
    (data) => Boolean(data.roadSegmentId || data.stretchName),
    {
      message: 'Either roadSegmentId or stretchName must be provided',
      path: ['roadSegmentId'],
    }
  );

// ── Sector Alert Schema ─────────────────────────────────────────────────────
export const alertParamsSchema = z.object({
  id: z.string().trim().min(1, 'Alert ID parameter is required'),
});

