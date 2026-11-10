import mongoose from 'mongoose';
import { User } from '../modules/users/user.model';
import { Alert } from '../modules/alerts/alert.model';
import { AlertDelivery } from '../modules/alerts/alertDelivery.model';
import { Road } from '../modules/roads/road.model';
import { Report } from '../modules/reports/report.model';
import { Contact } from '../modules/contact/contact.model';
import { Invite } from '../modules/auth/invite.model';
import { FieldOfficerTaskModel, RoadStatusUpdateModel, AlertAcknowledgmentModel } from '../modules/fieldOfficer/fieldOfficer.model';
import { Village } from '../modules/villages/village.model';
import { Shelter } from '../modules/villages/shelter.model';
import { Notification } from '../modules/notifications/notification.model';
import { CheckIn } from '../modules/citizen/checkin.model';
import { AuditLog } from '../modules/audit/auditLog.model';

export interface CollectionSummary {
  name: string;
  count: number;
}

/**
 * Idempotently initializes the collections and indexes in the active database.
 * Does not insert dummy records or modify existing data.
 */
export async function initCollections(): Promise<{
  databaseName: string;
  collections: CollectionSummary[];
}> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection is not open');
  }

  const databaseName = mongoose.connection.name;

  // Retrieve current existing collections
  const existingList = await db.listCollections().toArray();
  const existingNames = new Set(existingList.map((c) => c.name));

  const targetModels = [
    { name: 'users', model: User },
    { name: 'alerts', model: Alert },
    { name: 'alert_deliveries', model: AlertDelivery },
    { name: 'roads', model: Road },
    { name: 'reports', model: Report },
    { name: 'contacts', model: Contact },
    { name: 'invites', model: Invite },
    { name: 'tasks', model: FieldOfficerTaskModel },
    { name: 'road_status_updates', model: RoadStatusUpdateModel },
    { name: 'alert_acknowledgments', model: AlertAcknowledgmentModel },
    { name: 'villages', model: Village },
    { name: 'shelters', model: Shelter },
    { name: 'notifications', model: Notification },
    { name: 'checkins', model: CheckIn },
    { name: 'audit_logs', model: AuditLog },
  ];

  for (const { name, model } of targetModels) {
    // Explicitly create collection if it doesn't exist
    if (!existingNames.has(name)) {
      await db.createCollection(name);
    }
    // Initialize indexes declared on schema
    await model.init();
  }

  // Gather current collections and document counts
  const currentList = await db.listCollections().toArray();
  const summaries: CollectionSummary[] = [];

  for (const col of currentList) {
    const count = await db.collection(col.name).countDocuments();
    summaries.push({
      name: col.name,
      count,
    });
  }

  return {
    databaseName,
    collections: summaries,
  };
}

