import { z } from 'zod';

export const getRiskMapQuerySchema = z.object({
  state: z.string().trim().optional(),
  isMajorNH: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return true;
    if (val === 'false' || val === false) return false;
    return true;
  }, z.boolean()).default(true),
  format: z.enum(['json', 'geojson']).default('json'),
  bbox: z
    .string()
    .trim()
    .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'bbox must be in format minLng,minLat,maxLng,maxLat')
    .optional(),
  minLng: z.coerce.number().optional(),
  minLat: z.coerce.number().optional(),
  maxLng: z.coerce.number().optional(),
  maxLat: z.coerce.number().optional(),
});

export const getAlertsQuerySchema = z.object({
  state: z.string().trim().optional(),
  severity: z.enum(['Critical', 'Warning', 'Watch'], {
    message: 'Severity filter must be Critical, Warning, or Watch',
  }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const getRoadStatusQuerySchema = z.object({
  state: z.string().trim().optional(),
  status: z.enum(['open', 'caution', 'partial', 'blocked'], {
    message: 'Status filter must be open, caution, partial, or blocked',
  }).optional(),
});

export type GetRiskMapQuery = z.infer<typeof getRiskMapQuerySchema>;
export type GetAlertsQuery = z.infer<typeof getAlertsQuerySchema>;
export type GetRoadStatusQuery = z.infer<typeof getRoadStatusQuerySchema>;

