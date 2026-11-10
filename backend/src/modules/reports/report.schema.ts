import { z } from 'zod';
import { env } from '../../config/env';

const coordinatesTupleSchema = z
  .tuple([
    z
      .number()
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180'),
    z
      .number()
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90'),
  ])
  .transform((coords): { type: 'Point'; coordinates: [number, number] } => ({
    type: 'Point',
    coordinates: [coords[0], coords[1]],
  }));

const geoJsonPointSchema = z
  .object({
    type: z.literal('Point'),
    coordinates: z.tuple([
      z
        .number()
        .min(-180, 'Longitude must be between -180 and 180')
        .max(180, 'Longitude must be between -180 and 180'),
      z
        .number()
        .min(-90, 'Latitude must be between -90 and 90')
        .max(90, 'Latitude must be between -90 and 90'),
    ]),
  })
  .transform((point): { type: 'Point'; coordinates: [number, number] } => ({
    type: 'Point',
    coordinates: [point.coordinates[0], point.coordinates[1]],
  }));

export const reportCoordinatesSchema = z.union([coordinatesTupleSchema, geoJsonPointSchema]);

/**
 * Validates that a submitted photoUrl is a safe, valid HTTPS URL matching approved storage domains.
 */
export function validatePhotoStorageUrl(urlStr: string): { valid: boolean; message?: string } {
  const trimmed = urlStr.trim();
  if (!trimmed) {
    return { valid: true };
  }

  // Allow relative upload paths served by our backend
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    return { valid: true };
  }

  // Reject unsafe pseudo-schemes immediately
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('vbscript:')
  ) {
    return { valid: false, message: 'Unsafe URL scheme is strictly forbidden.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, message: 'Photo URL must be a valid, well-formed URL.' };
  }

  // Allow localhost/loopback in dev/test
  if ((parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') && parsed.pathname.startsWith('/uploads')) {
    return { valid: true };
  }

  // Enforce HTTPS
  if (parsed.protocol !== 'https:') {
    return { valid: false, message: 'Photo URL must use secure HTTPS protocol.' };
  }

  // Disallow user:password in authority
  if (parsed.username || parsed.password) {
    return { valid: false, message: 'Photo URL must not contain user credentials.' };
  }

  // Check configured cloud storage domains
  const rawDomains = env.ALLOWED_PHOTO_DOMAINS?.trim() || '';
  const allowedDomains = rawDomains
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  if (allowedDomains.length === 0) {
    return {
      valid: false,
      message: 'Photo attachments are not currently supported because no approved cloud storage domains are configured.',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isAllowed = allowedDomains.some(
    (allowed) => hostname === allowed || hostname.endsWith('.' + allowed)
  );

  if (!isAllowed) {
    return {
      valid: false,
      message: `Photo domain '${hostname}' is not in the approved list of cloud storage providers.`,
    };
  }

  return { valid: true };
}

export const createPublicReportSchema = z.object({
  state: z
    .string()
    .trim()
    .min(1, 'State is required')
    .max(100, 'State cannot exceed 100 characters'),
  location: z
    .string()
    .trim()
    .min(2, 'Location details or corridor stretch are required')
    .max(300, 'Location cannot exceed 300 characters'),
  hazardType: z
    .string()
    .trim()
    .min(2, 'Hazard type is required')
    .max(100, 'Hazard type cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .min(5, 'Description must be at least 5 characters')
    .max(3000, 'Description cannot exceed 3000 characters'),
  severity: z
    .enum(['Critical', 'Warning', 'Watch'], {
      message: 'Severity must be Critical, Warning, or Watch',
    })
    .default('Warning'),
  reporterName: z
    .string()
    .trim()
    .max(100, 'Reporter name cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
  reporterPhone: z
    .string()
    .trim()
    .max(20, 'Reporter phone cannot exceed 20 characters')
    .optional()
    .or(z.literal('')),
  photoUrl: z
    .string()
    .trim()
    .max(1000, 'Photo URL cannot exceed 1000 characters')
    .optional()
    .or(z.literal(''))
    .superRefine((val, ctx) => {
      if (!val || val.trim() === '') return;
      const res = validatePhotoStorageUrl(val);
      if (!res.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: res.message || 'Invalid photo URL.',
        });
      }
    }),
  coordinates: reportCoordinatesSchema.optional(),
  captchaToken: z
    .string()
    .trim()
    .min(1, 'CAPTCHA verification token is required'),
});

export const createAuthenticatedReportSchema = z.object({
  state: z
    .string()
    .trim()
    .min(1, 'State is required')
    .max(100, 'State cannot exceed 100 characters'),
  location: z
    .string()
    .trim()
    .min(2, 'Location details or corridor stretch are required')
    .max(300, 'Location cannot exceed 300 characters'),
  hazardType: z
    .string()
    .trim()
    .min(2, 'Hazard type is required')
    .max(100, 'Hazard type cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .min(5, 'Description must be at least 5 characters')
    .max(3000, 'Description cannot exceed 3000 characters'),
  severity: z
    .enum(['Critical', 'Warning', 'Watch'], {
      message: 'Severity must be Critical, Warning, or Watch',
    })
    .default('Warning'),
  reporterName: z
    .string()
    .trim()
    .max(100)
    .optional()
    .or(z.literal('')),
  reporterPhone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal('')),
  photoUrl: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .or(z.literal(''))
    .superRefine((val, ctx) => {
      if (!val || val.trim() === '') return;
      const res = validatePhotoStorageUrl(val);
      if (!res.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: res.message || 'Invalid photo URL.',
        });
      }
    }),
  coordinates: reportCoordinatesSchema.optional(),
});

export const triageReportSchema = z.object({
  status: z.enum(['submitted', 'under_review', 'verified', 'rejected', 'false_alarm']),
  verificationNotes: z.string().trim().max(1000).optional(),
});

export const assignTaskSchema = z.object({
  sector: z.string().trim().min(1, 'Sector is required'),
  riskLevel: z.enum(['Low', 'Moderate', 'High', 'Critical']).default('High'),
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(1000),
  assignedTo: z.string().trim().optional(),
  deadline: z.coerce.date().optional(),
  reportId: z.string().trim().optional(),
  chainageName: z.string().trim().optional(),
  coordinates: z.tuple([z.number(), z.number()]).optional(),
});

export type CreatePublicReportInput = z.infer<typeof createPublicReportSchema>;
export type CreateAuthenticatedReportInput = z.infer<typeof createAuthenticatedReportSchema>;
export type TriageReportInput = z.infer<typeof triageReportSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;

export const getReportsQuerySchema = z.object({
  state: z.string().trim().max(100).optional(),
  status: z.string().trim().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type GetReportsQueryInput = z.infer<typeof getReportsQuerySchema>;

