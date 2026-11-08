import mongoose from 'mongoose';
import { env } from './env';
import { initCollections } from './initCollections';

export async function connectDB(): Promise<typeof mongoose> {
  try {
    // Explicitly connect to the Terra360 database
    const conn = await mongoose.connect(env.MONGODB_URI, {
      dbName: 'Terra360',
    });

    // Safe startup logs: host, database name and status — never exposes connection string, credentials or password
    console.log(`\n==================================================`);
    console.log(`📦 MongoDB Connection Established`);
    console.log(`📡 Cluster Host:       ${conn.connection.host}`);
    console.log(`📁 Database Name:      ${conn.connection.name}`);
    console.log(`🔌 Connection Status:  ${conn.connection.readyState === 1 ? 'Ready (1)' : 'Connecting (2)'}`);
    console.log(`==================================================\n`);

    // Ensure collections and schema indexes exist idempotently
    await initCollections();

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('📦 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error during MongoDB disconnection:', error);
  }
}
