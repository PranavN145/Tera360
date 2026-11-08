import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../modules/users/user.model';

interface DemoAccount {
  name: string;
  email: string;
  password: string;
  role: 'citizen' | 'driver' | 'field_officer' | 'officer' | 'admin';
  phone?: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: 'Priyam Hazarika',
    email: 'citizen@terra360.in',
    password: 'Password123!',
    role: 'citizen',
    phone: '+91 98765 00001',
  },
  {
    name: 'Rongsen Ao',
    email: 'driver@terra360.in',
    password: 'Password123!',
    role: 'driver',
    phone: '+91 98765 00004',
  },
  {
    name: 'Vikram Sharma',
    email: 'officer@terra360.in',
    password: 'Password123!',
    role: 'officer',
    phone: '+91 98765 00002',
  },
  {
    name: 'Temsu Jamir',
    email: 'field@terra360.in',
    password: 'Password123!',
    role: 'field_officer',
    phone: '+91 98765 00003',
  },
  {
    name: 'System Admin',
    email: 'admin@terra360.in',
    password: 'Password123!',
    role: 'admin',
    phone: '+91 98765 00005',
  },
];

async function seed() {
  if (env.NODE_ENV === 'production') {
    console.error('\n❌ Refusing to run seed script in production environment!');
    console.error('Demo users with default passwords cannot be created or reset in production.\n');
    process.exit(1);
  }

  console.log('\n🌱 Connecting to MongoDB to seed demo users...');
  await connectDB();

  for (const account of DEMO_ACCOUNTS) {
    const existing = await User.findOne({ email: account.email });

    const passwordHash = await bcrypt.hash(account.password, 10);

    if (existing) {
      existing.name = account.name;
      existing.passwordHash = passwordHash;
      existing.role = account.role;
      existing.emailVerified = true;
      existing.isActive = true;
      existing.phone = account.phone;
      await existing.save();
      console.log(`  ↻ Updated existing user: ${account.email} (${account.role})`);
    } else {
      await User.create({
        name: account.name,
        email: account.email,
        passwordHash,
        role: account.role,
        emailVerified: true,
        isActive: true,
        phone: account.phone,
        language: 'en',
      });
      console.log(`  ✓ Created new user: ${account.email} (${account.role})`);
    }
  }

  console.log('\n========================================================');
  console.log('✅ DEMO ACCOUNTS READY TO USE');
  console.log('========================================================');
  for (const account of DEMO_ACCOUNTS) {
    console.log(`• Role:     ${account.role.toUpperCase()}`);
    console.log(`  Name:     ${account.name}`);
    console.log(`  Email:    ${account.email}`);
    console.log(`  Password: ${account.password}\n`);
  }
  console.log('========================================================\n');

  await disconnectDB();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error('\n❌ Failed to seed demo users:', err.message);
  console.error('Make sure your MongoDB database is running and reachable via MONGODB_URI.');
  await disconnectDB();
  process.exit(1);
});

