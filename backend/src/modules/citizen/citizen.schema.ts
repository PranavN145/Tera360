import { z } from 'zod';

export const checkInSchema = z.object({
  status: z.enum(['safe', 'need_help', 'evacuating']),
  message: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(500).optional(),
  locationName: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
  coordinates: z
    .union([
      z.object({
        type: z.literal('Point').optional(),
        coordinates: z.tuple([z.number(), z.number()]),
      }),
      z.tuple([z.number(), z.number()]),
    ])
    .optional(),
  membersCount: z.number().int().min(1).max(50).optional().default(1),
});

export const createCheckinSchema = checkInSchema;

export type CreateCheckinInput = z.infer<typeof createCheckinSchema>;
