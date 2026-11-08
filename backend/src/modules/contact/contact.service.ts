import { Contact } from './contact.model';
import { CreateContactInput } from './contact.schema';

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

