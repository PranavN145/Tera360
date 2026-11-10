import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../modules/users/user.model';
import { Road } from '../modules/roads/road.model';
import { Alert } from '../modules/alerts/alert.model';
import { Village } from '../modules/villages/village.model';
import { Shelter } from '../modules/villages/shelter.model';
import { FieldOfficerTaskModel } from '../modules/fieldOfficer/fieldOfficer.model';

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

const DEMO_ROADS = [
  {
    name: 'Dimapur – Kohima – Mao Highway',
    code: 'NH-29',
    state: 'Nagaland',
    stretch: 'KM 38 to KM 52 (Phesama – Dzüdza)',
    geometry: {
      type: 'Point' as const,
      coordinates: [94.025, 25.685],
    },
    coordinatesText: '25.6850° N, 94.0250° E',
    mapCoordinates: { x: 74, y: 44 },
    status: 'blocked' as const,
    riskLevel: 'Critical' as const,
    statusReason: 'Major slope failure and severe mud deposit near Dzüdza Bridge; clearance underway.',
    isMajorNH: true,
  },
  {
    name: 'Sevoke – Teesta Gorge – Rangpo Highway',
    code: 'NH-10',
    state: 'Sikkim',
    stretch: 'KM 24 to KM 32 (29th Mile / Coronation Bridge)',
    geometry: {
      type: 'Point' as const,
      coordinates: [88.485, 27.05],
    },
    coordinatesText: '27.0500° N, 88.4850° E',
    mapCoordinates: { x: 26, y: 34 },
    status: 'caution' as const,
    riskLevel: 'High' as const,
    statusReason: 'Active rockfall and riverbank slope cutting; heavy vehicles restricted.',
    isMajorNH: true,
  },
  {
    name: 'Haflong – Jatinga – Silchar Highway',
    code: 'NH-27',
    state: 'Assam',
    stretch: 'KM 110 to KM 135 (Borail Hill Range)',
    geometry: {
      type: 'Point' as const,
      coordinates: [93.02, 25.17],
    },
    coordinatesText: '25.1700° N, 93.0200° E',
    mapCoordinates: { x: 52, y: 52 },
    status: 'open' as const,
    riskLevel: 'Moderate' as const,
    statusReason: 'Normal transit operational; cautionary speed limits on mountain curves.',
    isMajorNH: true,
  },
];

const DEMO_ALERTS = [
  {
    title: 'Major Landslide Blockage on NH-29 (Dzüdza Bridge Sector)',
    severity: 'Critical' as const,
    state: 'Nagaland',
    corridor: 'NH-29',
    location: 'Dzüdza Bridge, KM 44 (Kohima District)',
    description:
      'Continuous torrential rains triggered massive slope collapse at Dzüdza. Debris spans 60m of roadway. Excavators deployed.',
    coordinates: {
      type: 'Point' as const,
      coordinates: [94.025, 25.685] as [number, number],
    },
    coordinatesText: '25.6850° N, 94.0250° E',
    rainfall24h: '172 mm / 24h',
    saturation: '94% Soil Moisture',
    trafficStatus: 'Fully Blocked — Traffic Diverted via Peducha-Tsiesema bypass',
    advisory:
      'Strict transit halt for heavy trucks. Light vehicles advised to travel only via certified bypass during daylight.',
    status: 'published' as const,
  },
  {
    title: 'Active Rockfall Hazard along Sevoke-Teesta Gorge',
    severity: 'Warning' as const,
    state: 'Sikkim',
    corridor: 'NH-10',
    location: '29th Mile, Teesta River Valley',
    description:
      'Intermittent rock shooting and debris slide along high shear zones. River water level rising near road toe.',
    coordinates: {
      type: 'Point' as const,
      coordinates: [88.485, 27.05] as [number, number],
    },
    coordinatesText: '27.0500° N, 88.4850° E',
    rainfall24h: '118 mm / 24h',
    saturation: '82% Soil Moisture',
    trafficStatus: 'Single-Lane Regulated Transit (One-Way Pilot Convoy)',
    advisory:
      'Night-time transit prohibited between 20:00 and 06:00. Maintain 50m vehicle spacing in gorge section.',
    status: 'published' as const,
  },
  {
    title: 'Slope Creep Watch in Borail Hill Range (Dima Hasao)',
    severity: 'Watch' as const,
    state: 'Assam',
    corridor: 'NH-27',
    location: 'Jatinga Slope (KM 118)',
    description:
      'Precipitation threshold approached. Early geotechnical sensors report minor tension cracks along cut embankment.',
    coordinates: {
      type: 'Point' as const,
      coordinates: [93.02, 25.17] as [number, number],
    },
    coordinatesText: '25.1700° N, 93.0200° E',
    rainfall24h: '64 mm / 24h',
    saturation: '68% Soil Moisture',
    trafficStatus: 'Open with Advisory Speed 30 km/h',
    advisory:
      'Drivers should watch for falling pebbles and avoid parking near exposed steep rock cuts.',
    status: 'published' as const,
  },
];

async function seed() {
  if (env.NODE_ENV === 'production') {
    console.error('\n❌ Refusing to run seed script in production environment!');
    console.error('Demo data cannot be seeded in production.\n');
    process.exit(1);
  }

  console.log('\n🌱 Connecting to MongoDB to seed demo data...');
  await connectDB();

  // 1. Seed Demo Accounts
  console.log('\n--- 1. Seeding Demo Users ---');
  let officerId: any = undefined;

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
      if (account.role === 'officer') officerId = existing._id;
      console.log(`  ↻ Updated existing user: ${account.email} (${account.role})`);
    } else {
      const created = await User.create({
        name: account.name,
        email: account.email,
        passwordHash,
        role: account.role,
        emailVerified: true,
        isActive: true,
        phone: account.phone,
        language: 'en',
      });
      if (account.role === 'officer') officerId = created._id;
      console.log(`  ✓ Created new user: ${account.email} (${account.role})`);
    }
  }

  // 2. Seed Demo Roads
  console.log('\n--- 2. Seeding Demo Roads & Corridors ---');
  for (const roadData of DEMO_ROADS) {
    const existing = await Road.findOne({ code: roadData.code, stretch: roadData.stretch });
    if (existing) {
      existing.name = roadData.name;
      existing.state = roadData.state;
      existing.geometry = roadData.geometry;
      existing.coordinatesText = roadData.coordinatesText;
      existing.mapCoordinates = roadData.mapCoordinates;
      existing.status = roadData.status;
      existing.riskLevel = roadData.riskLevel;
      existing.statusReason = roadData.statusReason;
      existing.isMajorNH = roadData.isMajorNH;
      existing.lastUpdated = new Date();
      existing.isDeleted = false;
      await existing.save();
      console.log(`  ↻ Updated road: ${roadData.code} - ${roadData.stretch} [${roadData.status.toUpperCase()}]`);
    } else {
      await Road.create({
        ...roadData,
        lastUpdated: new Date(),
        isDeleted: false,
      });
      console.log(`  ✓ Created road: ${roadData.code} - ${roadData.stretch} [${roadData.status.toUpperCase()}]`);
    }
  }

  // 3. Seed Demo Alerts
  console.log('\n--- 3. Seeding Demo Published Alerts ---');
  for (let i = 0; i < DEMO_ALERTS.length; i++) {
    const alertData = DEMO_ALERTS[i];
    const existing = await Alert.findOne({ corridor: alertData.corridor, title: alertData.title });
    const publishedAt = new Date(Date.now() - i * 3600000 * 2);

    if (existing) {
      existing.severity = alertData.severity;
      existing.state = alertData.state;
      existing.location = alertData.location;
      existing.description = alertData.description;
      existing.coordinates = alertData.coordinates;
      existing.coordinatesText = alertData.coordinatesText;
      existing.rainfall24h = alertData.rainfall24h;
      existing.saturation = alertData.saturation;
      existing.trafficStatus = alertData.trafficStatus;
      existing.advisory = alertData.advisory;
      existing.status = alertData.status;
      existing.publishedAt = publishedAt;
      existing.isDeleted = false;
      if (officerId) existing.createdBy = officerId;
      await existing.save();
      console.log(`  ↻ Updated alert: ${alertData.corridor} - ${alertData.title} [${alertData.severity}]`);
    } else {
      await Alert.create({
        ...alertData,
        publishedAt,
        createdBy: officerId,
        isDeleted: false,
      });
      console.log(`  ✓ Created alert: ${alertData.corridor} - ${alertData.title} [${alertData.severity}]`);
    }
  }

  // 4. Seed Shelters & Villages
  console.log('\n--- 4. Seeding Villages & Evacuation Shelters ---');
  const DEMO_SHELTERS = [
    {
      name: 'Phesama Community Hall & Youth Center',
      villageName: 'Phesama',
      district: 'Kohima',
      state: 'Nagaland',
      address: 'Upper Sector, Near Phesama Baptist Church',
      capacity: 450,
      currentOccupancy: 35,
      status: 'Operational' as const,
      coordinates: { type: 'Point' as const, coordinates: [94.114, 25.645] as [number, number] },
      helpline: '+91 94360 01122',
      amenities: ['Drinking water', 'First aid station', 'Satellite wireless phone', 'Backup generator'],
      walkingDirections: 'Ascend paved village stairway 200m east of primary market square',
      drivingDirections: 'Turn uphill at KM 44 landmark; 800m concrete link road',
      contactPersonName: 'Keviselie Angami',
      contactPersonPhone: '+91 98620 54321',
      isActive: true,
    },
    {
      name: 'Dzüdza High Ground Relief Camp',
      villageName: 'Dzüdza',
      district: 'Kohima',
      state: 'Nagaland',
      address: 'Hilltop Terrace, Dzüdza Bridge Diversion',
      capacity: 600,
      currentOccupancy: 120,
      status: 'Operational' as const,
      coordinates: { type: 'Point' as const, coordinates: [94.028, 25.688] as [number, number] },
      helpline: '+91 94360 01133',
      amenities: ['Emergency rations', 'Medical triage tent', 'Water storage tanks', 'Radio relay'],
      walkingDirections: 'Follow marked emergency evacuation ribbons up the west ridge',
      contactPersonName: 'Neituo Sekhose',
      contactPersonPhone: '+91 98621 65432',
      isActive: true,
    },
  ];

  const shelterMap = new Map<string, any>();
  for (const s of DEMO_SHELTERS) {
    const existing = await Shelter.findOne({ name: s.name });
    if (existing) {
      Object.assign(existing, s);
      await existing.save();
      shelterMap.set(s.villageName, existing._id);
    } else {
      const created = await Shelter.create(s);
      shelterMap.set(s.villageName, created._id);
    }
  }

  const DEMO_VILLAGES = [
    {
      villageName: 'Phesama',
      state: 'Nagaland',
      district: 'Kohima',
      population: 3400,
      riskLevel: 'Moderate' as const,
      coordinates: { type: 'Point' as const, coordinates: [94.112, 25.642] as [number, number] },
      rainfall24h: 88,
      saturationIndex: 78,
      evacuationStatus: 'Advisory' as const,
      primaryShelterId: shelterMap.get('Phesama'),
      contactPersons: [
        { name: 'Keviselie Angami', phone: '+91 98620 54321', designation: 'Village Council Chairman' },
      ],
      notes: 'Active runoff along steep residential terraces; light debris clearing underway.',
    },
    {
      villageName: 'Dzüdza',
      state: 'Nagaland',
      district: 'Kohima',
      population: 1200,
      riskLevel: 'Critical' as const,
      coordinates: { type: 'Point' as const, coordinates: [94.025, 25.685] as [number, number] },
      rainfall24h: 142,
      saturationIndex: 94,
      evacuationStatus: 'Evacuate' as const,
      primaryShelterId: shelterMap.get('Dzüdza'),
      contactPersons: [
        { name: 'Neituo Sekhose', phone: '+91 98621 65432', designation: 'Head GB / Community Lead' },
      ],
      notes: '60m active mudflow blockage on highway toe; immediate evacuation alert active.',
    },
    {
      villageName: 'Khonoma',
      state: 'Nagaland',
      district: 'Kohima',
      population: 2100,
      riskLevel: 'Low' as const,
      coordinates: { type: 'Point' as const, coordinates: [94.02, 25.65] as [number, number] },
      rainfall24h: 45,
      saturationIndex: 52,
      evacuationStatus: 'Normal' as const,
      contactPersons: [
        { name: 'Vitsolie Punyü', phone: '+91 98622 76543', designation: 'Community Elder' },
      ],
      notes: 'Normal conditions; terraces well maintained.',
    },
  ];

  for (const v of DEMO_VILLAGES) {
    const existing = await Village.findOne({ villageName: v.villageName, state: v.state });
    if (existing) {
      Object.assign(existing, v);
      await existing.save();
    } else {
      await Village.create(v);
    }
  }

  // 5. Seed Field Tasks
  console.log('\n--- 5. Seeding Field Officer Tasks ---');
  const fieldOfficer = await User.findOne({ role: 'field_officer' });
  const DEMO_TASKS = [
    {
      taskId: 'TSK-201',
      sector: 'Sector 4 - Kohima Ridge',
      location: {
        type: 'Point' as const,
        coordinates: [94.025, 25.685] as [number, number],
        chainageName: 'NH-29 KM 42 (Phesama Cut)',
        landmark: 'Dzüdza Bridge Approach',
      },
      riskLevel: 'Critical' as const,
      reason: 'Inspect debris fence tension and drainage runoff after 142mm heavy precipitation.',
      deadline: new Date(Date.now() + 24 * 3600000),
      status: 'Assigned' as const,
      assignedBy: 'Disaster Officer Vikram Sharma',
      assignedTo: fieldOfficer?._id,
      assignedAt: new Date(),
    },
    {
      taskId: 'TSK-202',
      sector: 'Sector 4 - Kohima Ridge',
      location: {
        type: 'Point' as const,
        coordinates: [94.112, 25.642] as [number, number],
        chainageName: 'Phesama Bypass Cut KM 44',
        landmark: 'Phesama Baptist School Curve',
      },
      riskLevel: 'High' as const,
      reason: 'Verify tension crack width across highway retaining wall.',
      deadline: new Date(Date.now() + 48 * 3600000),
      status: 'In_Progress' as const,
      assignedBy: 'Disaster Officer Vikram Sharma',
      assignedTo: fieldOfficer?._id,
      assignedAt: new Date(Date.now() - 3600000),
      startedAt: new Date(Date.now() - 1800000),
    },
  ];

  for (const t of DEMO_TASKS) {
    const existing = await FieldOfficerTaskModel.findOne({ taskId: t.taskId });
    if (existing) {
      Object.assign(existing, t);
      await existing.save();
    } else {
      await FieldOfficerTaskModel.create(t);
    }
  }
  console.log('✅ ALL DEMO DATA SEEDED SUCCESSFULLY');
  console.log('========================================================');
  console.log('Corridors: 3 (NH-29 Nagaland, NH-10 Sikkim, NH-27 Assam)');
  console.log('Alerts:    3 (Critical, Warning, Watch)');
  console.log('Accounts:  5 (citizen, driver, officer, field, admin)');
  console.log('========================================================\n');

  await disconnectDB();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error('\n❌ Failed to seed demo data:', err.message);
  console.error('Make sure your MongoDB database is running and reachable via MONGODB_URI.');
  await disconnectDB();
  process.exit(1);
});

