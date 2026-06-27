/**
 * Mideye – Add 5 demo user accounts (does not delete existing data).
 * Run: npm run seed:users
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB } = require('./config/database');
require('./models/index');
const { User } = require('./models');

const DEMO_PASSWORD = 'User@123';

const DEMO_USERS = [
  { full_name: 'Ahmed Hassan',   email: 'ahmed@mideye.so',   phone: '+252 90 1110001' },
  { full_name: 'Fatima Mohamed', email: 'fatima@mideye.so',  phone: '+252 90 1110002' },
  { full_name: 'Omar Abdi',      email: 'omar@mideye.so',    phone: '+252 90 1110003' },
  { full_name: 'Amina Warsame',  email: 'amina@mideye.so',   phone: '+252 90 1110004' },
  { full_name: 'Hassan Idle',    email: 'hassan@mideye.so',  phone: '+252 90 1110005' },
];

const run = async () => {
  try {
    await connectDB();

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, salt);

    let created = 0;
    let skipped = 0;

    for (const u of DEMO_USERS) {
      const exists = await User.findOne({ where: { email: u.email } });
      if (exists) {
        skipped++;
        console.log(`⏭️  Skipped (exists): ${u.email}`);
        continue;
      }

      await User.create({
        ...u,
        password: hashedPassword,
        role: 'user',
      });
      created++;
      console.log(`✅ Created: ${u.full_name} <${u.email}>`);
    }

    const totalUsers = await User.count();
    const totalRegular = await User.count({ where: { role: 'user' } });

    console.log('');
    console.log('✅ Done!');
    console.log(`   New users:      ${created}`);
    console.log(`   Skipped:        ${skipped}`);
    console.log(`   Total users:    ${totalUsers}`);
    console.log(`   Regular users:  ${totalRegular}`);
    console.log(`   Demo password:  ${DEMO_PASSWORD}`);
    console.log('');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  }
};

run();
