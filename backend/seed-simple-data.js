/**
 * Mideye – Reset demo data: Gmail users + 20 bookings + 20 cargo
 * Run: npm run seed:simple
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB } = require('./config/database');
require('./models/index');
const { User, Booking, Cargo } = require('./models');

const DEMO_PASSWORD = 'User@123';

const GMAIL_USERS = [
  { full_name: 'Ahmed Hassan',      email: 'ahmed.hassan@gmail.com',      phone: '+252 907 100001' },
  { full_name: 'Fatima Mohamed',    email: 'fatima.mohamed@gmail.com',    phone: '+252 907 100002' },
  { full_name: 'Omar Abdi',         email: 'omar.abdi@gmail.com',         phone: '+252 907 100003' },
  { full_name: 'Amina Warsame',     email: 'amina.warsame@gmail.com',     phone: '+252 907 100004' },
  { full_name: 'Hassan Idle',       email: 'hassan.idle@gmail.com',       phone: '+252 907 100005' },
  { full_name: 'Khadija Ali',       email: 'khadija.ali@gmail.com',       phone: '+252 907 100006' },
  { full_name: 'Yusuf Jama',        email: 'yusuf.jama@gmail.com',        phone: '+252 907 100007' },
  { full_name: 'Sahra Abdirahman',  email: 'sahra.abdirahman@gmail.com',  phone: '+252 907 100008' },
  { full_name: 'Mohamed Farah',     email: 'mohamed.farah@gmail.com',     phone: '+252 907 100009' },
  { full_name: 'Hodan Sheikh',      email: 'hodan.sheikh@gmail.com',      phone: '+252 907 100010' },
];

const ROUTES = [
  ['MGQ', 'HGA'],
  ['HGA', 'MGQ'],
  ['GLK', 'MGQ'],
  ['MGQ', 'KSM'],
  ['GLK', 'HGA'],
  ['BDI', 'MGQ'],
  ['MGQ', 'GLK'],
  ['HGA', 'KSM'],
  ['KSM', 'HGA'],
  ['GLK', 'BDI'],
];

const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
const CARGO_STATUSES = [
  'Pending', 'Confirmed', 'Received', 'Processing',
  'In Transit', 'Arrived', 'Ready for Pickup', 'Delivered', 'Cancelled',
];
const CARGO_TYPES = ['electronics', 'textiles', 'documents', 'food', 'furniture', 'machinery', 'other'];
const DESTINATIONS = ['MGQ', 'HGA', 'GLK', 'KSM', 'BDI'];

const addDays = (base, days) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const run = async () => {
  try {
    await connectDB();

    console.log('🗑️  Removing old bookings, cargo, and non-admin users...');
    await Booking.destroy({ where: {}, truncate: false });
    await Cargo.destroy({ where: {}, truncate: false });
    await User.destroy({ where: { role: 'user' } });

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, salt);

    console.log('👤 Creating Gmail users...');
    const users = [];
    for (const u of GMAIL_USERS) {
      const created = await User.create({
        ...u,
        password: hashedPassword,
        role: 'user',
      });
      users.push(created);
      console.log(`   ✅ ${created.full_name} <${created.email}>`);
    }

    const today = new Date();
    console.log('✈️  Creating 20 flight bookings...');
    for (let i = 0; i < 20; i++) {
      const user = users[i % users.length];
      const [origin, destination] = ROUTES[i % ROUTES.length];
      await Booking.create({
        user_id: user.id,
        trip_type: i % 5 === 0 ? 'roundtrip' : 'oneway',
        passenger_name: user.full_name,
        phone: user.phone,
        email: user.email,
        origin,
        destination,
        travel_date: addDays(today, 3 + i),
        return_date: i % 5 === 0 ? addDays(today, 8 + i) : null,
        adults: 1 + (i % 3),
        children: i % 4 === 0 ? 1 : 0,
        infants: 0,
        cabin_class: i % 4 === 0 ? 'business' : 'economy',
        status: BOOKING_STATUSES[i % BOOKING_STATUSES.length],
      });
    }

    console.log('📦 Creating 20 cargo shipments...');
    for (let i = 0; i < 20; i++) {
      const user = users[i % users.length];
      const trackingId = `MDY-${String(i + 1).padStart(4, '0')}`;
      await Cargo.create({
        tracking_id: trackingId,
        user_id: user.id,
        sender_name: user.full_name,
        sender_phone: user.phone,
        sender_email: user.email,
        sender_address: 'Galkacyo Main Street',
        recipient_name: `Recipient ${i + 1}`,
        recipient_phone: `+252 907 200${String(i + 1).padStart(3, '0')}`,
        origin: 'Galkacyo (GLK)',
        destination: DESTINATIONS[i % DESTINATIONS.length],
        cargo_type: CARGO_TYPES[i % CARGO_TYPES.length],
        pieces: 1 + (i % 5),
        weight: (5 + i * 2.5).toFixed(2),
        description: `Sample cargo shipment #${i + 1}`,
        shipping_speed: i % 3 === 0 ? 'express' : 'standard',
        insurance: i % 2 === 0,
        fragile: i % 5 === 0,
        signature_required: i % 4 === 0,
        status: CARGO_STATUSES[i % CARGO_STATUSES.length],
      });
      console.log(`   ✅ ${trackingId} → ${DESTINATIONS[i % DESTINATIONS.length]}`);
    }

    const stats = {
      users: await User.count({ where: { role: 'user' } }),
      bookings: await Booking.count(),
      cargo: await Cargo.count(),
      admin: await User.count({ where: { role: 'admin' } }),
    };

    console.log('');
    console.log('══════════════════════════════════════');
    console.log('✅ Sample data ready!');
    console.log(`   Admin accounts:  ${stats.admin}`);
    console.log(`   Gmail users:     ${stats.users}`);
    console.log(`   Bookings:        ${stats.bookings}`);
    console.log(`   Cargo:           ${stats.cargo}`);
    console.log(`   User password:   ${DEMO_PASSWORD}`);
    console.log('══════════════════════════════════════');
    console.log('');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  }
};

run();
