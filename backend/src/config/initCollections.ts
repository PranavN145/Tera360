import mongoose from 'mongoose';
import { User } from '../modules/users/user.model';
import { Alert } from '../modules/alerts/alert.model';
import { Road } from '../modules/roads/road.model';
import { Report } from '../modules/reports/report.model';
import { Contact } from '../modules/contact/contact.model';

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
    { name: 'roads', model: Road },
    { name: 'reports', model: Report },
    { name: 'contacts', model: Contact },
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

