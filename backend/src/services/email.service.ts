import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SentEmailLog {
  to: string;
  subject: string;
  text?: string;
  html: string;
  sentAt: Date;
}

// In-memory debug buffer for local development & testing
const devEmailLogs: SentEmailLog[] = [];

export function getDevEmailLogs(): SentEmailLog[] {
  return [...devEmailLogs];
}

export function clearDevEmailLogs(): void {
  devEmailLogs.length = 0;
}

export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 465,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const { to, subject, html, text } = options;

    if (this.transporter && env.NODE_ENV === 'production') {
      try {
        await this.transporter.sendMail({
          from: env.EMAIL_FROM,
          to,
          subject,
          html,
          text,
        });
        return;
      } catch (err: any) {
        console.error('❌ Failed to send production email:', err.message);
        throw err;
      }
    }

    // In non-production, if SMTP is configured, attempt sending but fall back gracefully to console logging if unreachable
    if (this.transporter && env.NODE_ENV !== 'production') {
      try {
        await this.transporter.sendMail({
          from: env.EMAIL_FROM,
          to,
          subject,
          html,
          text,
        });
        return;
      } catch (err: any) {
        console.warn(`⚠️ SMTP send failed (${err.code || err.message}). Falling back to local console output.`);
      }
    }

    if (env.NODE_ENV === 'production') {
      console.warn(`⚠️ Outgoing email to ${to} skipped: SMTP service not configured.`);
      return;
    }

    // Local development & test fallback: safe structured logging
    const logEntry: SentEmailLog = {
      to,
      subject,
      text,
      html,
      sentAt: new Date(),
    };
    devEmailLogs.push(logEntry);

    console.log('\n📧 ──────────────── [DEV EMAIL SERVICE] ────────────────');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    if (text) console.log(`Body:\n${text}`);
    console.log('───────────────────────────────────────────────────────\n');
  }

  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = 'Terra360 — Verify Your Email Address';
    const text = `Hello ${name},\n\nPlease verify your email address for Terra360 by clicking the link below (valid for 24 hours):\n${verifyUrl}\n\nIf you did not create a Terra360 account, please ignore this email.`;
    const escapedName = escapeHtml(name);
    const escapedUrl = escapeHtml(verifyUrl);
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #173D32; border-radius: 8px;">
        <h2 style="color: #173D32;">Verify Your Terra360 Account</h2>
        <p>Hello ${escapedName},</p>
        <p>Please click the button below to verify your email address. This link is valid for 24 hours.</p>
        <div style="margin: 25px 0;">
          <a href="${escapedUrl}" style="background-color: #173D32; color: #F6F4EC; padding: 12px 24px; text-decoration: none; border-radius: 40px; font-weight: bold; display: inline-block;">Verify Email</a>
        </div>
        <p style="color: #666; font-size: 12px;">Or copy and paste this link: ${escapedUrl}</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html, text });
  }

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
    const subject = 'Terra360 — Password Reset Request';
    const text = `Hello ${name},\n\nA password reset request was received for your Terra360 account. Click the link below to set a new password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email. Your password will remain unchanged.`;
    const escapedName = escapeHtml(name);
    const escapedUrl = escapeHtml(resetUrl);
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #173D32; border-radius: 8px;">
        <h2 style="color: #173D32;">Reset Your Terra360 Password</h2>
        <p>Hello ${escapedName},</p>
        <p>Click the button below to set a new password. This link is single-use and expires in 1 hour.</p>
        <div style="margin: 25px 0;">
          <a href="${escapedUrl}" style="background-color: #173D32; color: #F6F4EC; padding: 12px 24px; text-decoration: none; border-radius: 40px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 12px;">Or copy and paste this link: ${escapedUrl}</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html, text });
  }

  async sendInviteEmail(to: string, role: string, token: string): Promise<void> {
    const inviteUrl = `${env.CLIENT_URL}/login?inviteToken=${encodeURIComponent(token)}`;
    const roleLabel = role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const subject = `Terra360 — Staff Invitation (${roleLabel})`;
    const text = `Hello,\n\nYou have been invited to join the Terra360 disaster management platform as an authorized ${roleLabel}.\n\nPlease click the link below to accept your invitation and configure your staff account password (valid for 48 hours):\n${inviteUrl}\n\nStaff accounts require a minimum password length of 12 characters. If you did not expect this invitation, please contact your administrator.`;
    const escapedRole = escapeHtml(roleLabel);
    const escapedUrl = escapeHtml(inviteUrl);
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #173D32; border-radius: 8px;">
        <h2 style="color: #173D32;">Terra360 Staff Invitation</h2>
        <p>Hello,</p>
        <p>You have been invited to join Terra360 as an authorized <strong>${escapedRole}</strong>.</p>
        <p>Click the button below to accept your invitation and set your account password. Staff accounts require a password of at least 12 characters. This invitation expires in 48 hours.</p>
        <div style="margin: 25px 0;">
          <a href="${escapedUrl}" style="background-color: #173D32; color: #F6F4EC; padding: 12px 24px; text-decoration: none; border-radius: 40px; font-weight: bold; display: inline-block;">Accept Staff Invitation</a>
        </div>
        <p style="color: #666; font-size: 12px;">Or copy and paste this link: ${escapedUrl}</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html, text });
  }
}

export const emailService = new EmailService();
