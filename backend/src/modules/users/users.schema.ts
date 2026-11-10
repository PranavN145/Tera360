import { z } from 'zod';

export const userVillageInputSchema = z.object({
  state: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional(),
  villageName: z.string().trim().max(100).optional(),
});

export const familyContactInputSchema = z.object({
  name: z.string().trim().min(1, 'Family member name is required').max(100),
  phone: z
    .string()
    .trim()
    .min(7, 'Phone number must be at least 7 digits')
    .max(25, 'Phone number cannot exceed 25 characters')
    .regex(/^[+0-9\s\-()]+$/, 'Invalid phone number format'),
  relationship: z.string().trim().max(50).optional(),
});

export const alertPreferencesInputSchema = z.object({
  ivrs: z.boolean(),
  sms: z.boolean(),
  app: z.boolean(),
});

export const updateMeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  phone: z.string().max(25).optional(),
  language: z.enum(['en', 'as', 'bn', 'hi', 'mni', 'lus']).optional(),
  village: userVillageInputSchema.optional(),
  familyContacts: z.array(familyContactInputSchema).max(10, 'Maximum 10 family contacts permitted').optional(),
  alertPreferences: alertPreferencesInputSchema.optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(128, 'New password must not exceed 128 characters'),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => !data.confirmPassword || data.newPassword === data.confirmPassword,
    {
      message: 'New password and confirmation must match',
      path: ['confirmPassword'],
    }
  );

export const deleteAccountSchema = z.object({
  confirmationText: z
    .string()
    .min(1, 'Confirmation text is required'),
});

export const revokeSessionParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Session ID must be a valid 24-character hexadecimal ObjectId'),
});

export type RevokeSessionParamsInput = z.infer<typeof revokeSessionParamsSchema>;

export type UserVillageInput = z.infer<typeof userVillageInputSchema>;
export type FamilyContactInput = z.infer<typeof familyContactInputSchema>;
export type AlertPreferencesInput = z.infer<typeof alertPreferencesInputSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
