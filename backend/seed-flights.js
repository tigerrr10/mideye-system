require('dotenv').config();
const { connectDB } = require('./config/database');
const { Flight } = require('./models');

/** Same 7 airlines shown on the booking page (MGQ → HGA) */
const DEMO_FLIGHTS = [
  { airline: 'Daallo Airlines', origin: 'MGQ', destination: 'HGA', departure_time: '08:00 AM', duration: '2h 30m', price: 90 },
  { airline: 'Daruuro Airline', origin: 'MGQ', destination: 'HGA', departure_time: '09:00 AM', duration: '2h 30m', price: 95 },
  { airline: 'Saacid Airline', origin: 'MGQ', destination: 'HGA', departure_time: '10:00 AM', duration: '2h 30m', price: 100 },
  { airline: 'Freedom Airline Express', origin: 'MGQ', destination: 'HGA', departure_time: '11:00 AM', duration: '2h 30m', price: 90 },
  { airline: 'Jubbia Airways', origin: 'MGQ', destination: 'HGA', departure_time: '12:00 PM', duration: '2h 30m', price: 95 },
  { airline: 'Fly Premier Airlines', origin: 'MGQ', destination: 'HGA', departure_time: '01:00 PM', duration: '2h 30m', price: 100 },
  { airline: 'Salaam Air Express', origin: 'MGQ', destination: 'HGA', departure_time: '02:00 PM', duration: '2h 30m', price: 90 },
];

const buildDemoRows = () => {
  const dateStr = new Date().toISOString().split('T')[0];

  return DEMO_FLIGHTS.map((f, i) => {
    const basePrice = f.price;
    return {
      flight_id: `FL-${String(i + 1).padStart(4, '0')}`,
      flight_code: `MDY-FL-${String(i + 1).padStart(4, '0')}`,
      airline: f.airline,
      origin: f.origin,
      destination: f.destination,
      departure_time: f.departure_time,
      arrival_time: null,
      duration: f.duration,
      schedule_date: dateStr,
      price_economy: basePrice,
      price_business: Math.round(basePrice * 1.8 * 100) / 100,
      price_first: Math.round(basePrice * 2.5 * 100) / 100,
      total_seats: 120,
      available_seats: 80 + i,
      status: 'Active',
    };
  });
};

const seedFlights = async ({ force = false } = {}) => {
  const count = await Flight.count();
  if (count > 0 && !force) {
    console.log(`ℹ️  Flights table already has ${count} records — skipping seed.`);
    return;
  }

  if (count > 0) {
    await Flight.destroy({ where: {} });
    console.log(`🗑️  Cleared ${count} existing flights`);
  }

  const rows = buildDemoRows();
  await Flight.bulkCreate(rows);
  console.log(`✅ Seeded ${rows.length} demo flights`);
};

if (require.main === module) {
  const force = process.argv.includes('--force');
  connectDB()
    .then(() => seedFlights({ force }))
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedFlights, DEMO_FLIGHTS };
