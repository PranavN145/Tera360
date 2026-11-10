import mongoose from 'mongoose';
import { isEncrypted, encrypt } from '../utils/crypto';

export interface MigrationSummary {
  usersScanned: number;
  usersUpdated: number;
  phonesEncrypted: number;
  contactsEncrypted: number;
}

/**
 * Migration utility: Safely detects plaintext user phone numbers and family contacts
 * and encrypts them using AES-256-GCM without modifying already encrypted fields.
 */
export async function migratePlaintextUserData(): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    usersScanned: 0,
    usersUpdated: 0,
    phonesEncrypted: 0,
    contactsEncrypted: 0,
  };

  // Use raw collection queries to bypass Mongoose getters and inspect stored ciphertext directly
  const collection = mongoose.connection.collection('users');
  const cursor = collection.find({ isDeleted: false });

  while (await cursor.hasNext()) {
    const rawUser = await cursor.next();
    if (!rawUser) continue;
    summary.usersScanned++;

    const updates: Record<string, any> = {};
    let needsUpdate = false;

    // Check user phone
    if (rawUser.phone && typeof rawUser.phone === 'string' && !isEncrypted(rawUser.phone)) {
      updates.phone = encrypt(rawUser.phone);
      summary.phonesEncrypted++;
      needsUpdate = true;
    }

    // Check familyContacts[].phone
    if (Array.isArray(rawUser.familyContacts) && rawUser.familyContacts.length > 0) {
      let contactModified = false;
      const updatedContacts = rawUser.familyContacts.map((c: any) => {
        if (c.phone && typeof c.phone === 'string' && !isEncrypted(c.phone)) {
          summary.contactsEncrypted++;
          contactModified = true;
          return {
            ...c,
            phone: encrypt(c.phone),
          };
        }
        return c;
      });

      if (contactModified) {
        updates.familyContacts = updatedContacts;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await collection.updateOne({ _id: rawUser._id }, { $set: updates });
      summary.usersUpdated++;
    }
  }

  return summary;
}

