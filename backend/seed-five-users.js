/**
 * Add 5 demo users — each with at least one booking and one cargo shipment.
 * Run: node seed-five-users.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB } = require('./config/database');
require('./models/index');
const { User, Booking, Cargo } = require('./models');

const DEMO_PASSWORD = 'User@123';

const USERS = [
  { full_name: 'Abdiqadir Muse',   email: 'abdiqadir.muse@gmail.com',   phone: '+252 907 110001' },
  { full_name: 'Maryan Osman',     email: 'maryan.osman@gmail.com',     phone: '+252 907 110002' },
  { full_name: 'Ibrahim Noor',     email: 'ibrahim.noor@gmail.com',     phone: '+252 907 110003' },
  { full_name: 'Halima Aden',      email: 'halima.aden@gmail.com',      phone: '+252 907 110004' },
  { full_name: 'Abdullahi Gedi',   email: 'abdullahi.gedi@gmail.com',   phone: '+252 907 110005' },
];

const ROUTES = [
  ['MGQ', 'HGA'],
  ['HGA', 'MGQ'],
  ['GLK', 'MGQ'],
  ['MGQ', 'GLK'],
  ['HGA', 'KSM'],
];

const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Completed', 'Confirmed', 'Pending'];
const CARGO_STATUSES = ['Pending', 'In Transit', 'Delivered', 'Confirmed', 'Processing'];
const CARGO_TYPES = ['electronics', 'textiles', 'documents', 'food', 'furniture'];

const addDays = (base, days) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const nextTrackingId = async () => {
  const rows = await Cargo.findAll({ attributes: ['tracking_id'], raw: true });
  let max = 0;
  for (const row of rows) {
    const match = String(row.tracking_id || '').match(/MDY-(\d+)/i);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `MDY-${String(max + 1).padStart(4, '0')}`;
};

const run = async () => {
  try {
    await connectDB();

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, salt);
    const today = new Date();

    console.log('👤 Adding 5 users with booking + cargo each...');

    for (let i = 0; i < USERS.length; i++) {
      const u = USERS[i];
      let user = await User.findOne({ where: { email: u.email } });

      if (!user) {
        user = await User.create({
          ...u,
          password: hashedPassword,
          role: 'user',
        });
        console.log(`   ✅ User created: ${user.full_name}`);
      } else {
        console.log(`   ℹ️  User exists: ${user.full_name}`);
      }

      const [origin, destination] = ROUTES[i];
      const booking = await Booking.create({
        user_id: user.id,
        trip_type: i % 2 === 0 ? 'oneway' : 'roundtrip',
        passenger_name: user.full_name,
        phone: user.phone,
        email: user.email,
        origin,
        destination,
        travel_date: addDays(today, 5 + i * 2),
        return_date: i % 2 === 1 ? addDays(today, 10 + i * 2) : null,
        adults: 1 + (i % 2),
        children: i === 2 ? 1 : 0,
        infants: 0,
        cabin_class: i % 3 === 0 ? 'business' : 'economy',
        status: BOOKING_STATUSES[i],
      });

      const trackingId = await nextTrackingId();
      const cargo = await Cargo.create({
        tracking_id: trackingId,
        user_id: user.id,
        sender_name: user.full_name,
        sender_phone: user.phone,
        sender_email: user.email,
        sender_address: 'Galkacyo Main Street',
        recipient_name: `Qaataha ${i + 1}`,
        recipient_phone: `+252 907 220${String(i + 1).padStart(3, '0')}`,
        origin: 'Galkacyo (GLK)',
        destination: ['MGQ', 'HGA', 'GLK', 'KSM', 'BDI'][i],
        cargo_type: CARGO_TYPES[i],
        pieces: 1 + i,
        weight: (8 + i * 3).toFixed(2),
        description: `Cargo shipment for ${user.full_name}`,
        shipping_speed: i % 2 === 0 ? 'standard' : 'express',
        insurance: i % 2 === 0,
        fragile: i === 0,
        signature_required: i > 2,
        status: CARGO_STATUSES[i],
      });

      console.log(`      ✈️  Booking #${booking.id} (${origin} → ${destination})`);
      console.log(`      📦 Cargo ${cargo.tracking_id} → ${cargo.destination}`);
    }

    console.log('');
    console.log('══════════════════════════════════════');
    console.log('✅ Done! 5 users with booking + cargo added.');
    console.log(`   Password for all: ${DEMO_PASSWORD}`);
    console.log('══════════════════════════════════════');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

run();
