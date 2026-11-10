import { z } from 'zod';

export const createAlertSchema = z.object({
  title: z.string().trim().min(3).max(200),
  severity: z.enum(['Critical', 'Warning', 'Watch']),
  state: z.string().trim().min(1),
  corridor: z.string().trim().min(1),
  location: z.string().trim().max(200).optional(),
  description: z.string().trim().min(5).max(2000),
  advisory: z.string().trim().min(5).max(1000),
  audience: z
    .object({
      roles: z.array(z.string()).optional(),
      villageIds: z.array(z.string()).optional(),
      roadIds: z.array(z.string()).optional(),
    })
    .optional(),
  channels: z.array(z.enum(['sms', 'ivrs', 'push', 'app'])).optional(),
  messages: z.record(z.string(), z.string()).optional(),
  expiresAt: z.coerce.date().optional(),
  coordinates: z
    .object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()]),
    })
    .optional(),
});

export const approveAlertSchema = z.object({
  confirm: z.boolean().optional(),
});

export const cancelAlertSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const listAlertsQuerySchema = z.object({
  state: z.string().trim().optional(),
  severity: z.enum(['Critical', 'Warning', 'Watch']).optional(),
  status: z.enum(['draft', 'published', 'cancelled']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
