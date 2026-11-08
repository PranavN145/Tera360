import { connectDB, disconnectDB } from '../config/db';
import { initCollections } from '../config/initCollections';

async function run() {
  console.log('\n========================================================');
  console.log('🚀 TERRA360: EXPLICIT COLLECTION INITIALIZATION');
  console.log('========================================================\n');

  await connectDB();

  console.log('Synchronizing collections & Mongoose schema indexes...');
  const result = await initCollections();

  console.log(`\nActive Database: ${result.databaseName}`);
  console.log('Collections verified in database:');
  for (const col of result.collections) {
    console.log(`  • ${col.name.padEnd(12)} : ${col.count} document(s)`);
  }

  console.log('\n========================================================');
  console.log('✅ ALL COLLECTIONS INITIALIZED & INDEXED SUCCESSFULLY');
  console.log('========================================================\n');

  await disconnectDB();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('\n❌ Initialization failed:', err);
  await disconnectDB();
  process.exit(1);
});

