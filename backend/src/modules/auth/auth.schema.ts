import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),
  // STRICT RULE: Only citizen and driver may self-register
  role: z
    .enum(['citizen', 'driver'], {
      message: 'Public registration is restricted to citizen and driver roles only.',
    })
    .default('citizen'),
  phone: z.string().optional(),
  language: z.string().optional().default('en'),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),
});

export const acceptInviteSchema = z.object({
  token: z.string().trim().min(1, 'Invite token is required'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  password: z
    .string()
    .min(12, 'Staff password must be at least 12 characters')
    .max(128, 'Password must not exceed 128 characters'),
  phone: z.string().trim().max(25).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
