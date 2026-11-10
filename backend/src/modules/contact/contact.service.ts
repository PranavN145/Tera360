import { Contact } from './contact.model';
import { CreateContactInput } from './contact.schema';
import { emailService, escapeHtml } from '../../services/email.service';
import { env } from '../../config/env';

export interface RequestClientMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface PublicContactOutput {
  id: string;
  name: string;
  email: string;
  state: string;
  message: string;
  phone?: string;
  status: string;
  createdAt: Date;
}

export class ContactService {
  /**
   * Process and persist a public contact desk inquiry.
   */
  async submitContact(
    input: CreateContactInput,
    meta: RequestClientMeta = {}
  ): Promise<PublicContactOutput> {
    const contact = new Contact({
      name: input.name,
      email: input.email.toLowerCase(),
      state: input.state,
      message: input.message,
      phone: input.phone?.trim() || undefined,
      // Security: hardcoded status for newly received messages
      status: 'new',
      // Metadata for abuse prevention
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await contact.save();

    // AUD-14: Dispatch notification email to operations desk via emailService with escaped HTML
    try {
      const safeName = escapeHtml(input.name);
      const safeEmail = escapeHtml(input.email);
      const safeState = escapeHtml(input.state);
      const safePhone = input.phone ? escapeHtml(input.phone) : 'Not provided';
      const safeMessage = escapeHtml(input.message).replace(/\n/g, '<br/>');

      await emailService.sendEmail({
        to: env.EMAIL_FROM || 'ops@terra360.example',
        subject: `[Terra360 Contact Desk] New Inquiry from ${safeName} (${safeState})`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; line-height: 1.5; color: #111;">
            <h2 style="color: #c2410c;">Terra360 Public Inquiry Received</h2>
            <p><strong>Reporter Name:</strong> ${safeName}</p>
            <p><strong>Email Address:</strong> ${safeEmail}</p>
            <p><strong>State / Region:</strong> ${safeState}</p>
            <p><strong>Contact Phone:</strong> ${safePhone}</p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
            <p><strong>Message / Inquiry:</strong></p>
            <blockquote style="background: #f9fafb; padding: 12px; border-left: 4px solid #f97316; margin: 0;">
              ${safeMessage}
            </blockquote>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
            <p style="font-size: 12px; color: #6b7280;">Inquiry ID: ${contact._id.toString()} | IP: ${meta.ipAddress || 'unknown'}</p>
          </div>
        `,
        text: `New Inquiry from ${input.name} (${input.state})\nEmail: ${input.email}\nPhone: ${input.phone || 'N/A'}\n\nMessage:\n${input.message}`,
      });
    } catch (err: any) {
      console.warn('Non-blocking contact notification email dispatch error:', err.message);
    }

    return {
      id: contact._id.toString(),
      name: contact.name,
      email: contact.email,
      state: contact.state,
      message: contact.message,
      phone: contact.phone,
      status: contact.status,
      createdAt: contact.createdAt,
    };
  }
}

export const contactService = new ContactService();

