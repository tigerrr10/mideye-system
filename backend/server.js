require('dotenv').config();
const bcrypt = require('bcryptjs');
const app = require('./app');
const { connectDB } = require('./config/database');

require('./models/index');

const PORT = process.env.PORT || 5000;

// ─── Seed default admin account ───────────────────────────────────────────────
const { seedFlights } = require('./seed-flights');
const { seedCities } = require('./seed-cities');

const seedAdmin = async () => {
  try {
    const { User } = require('./models');

    const exists = await User.findOne({ where: { email: 'admin@mideye.com' } });
    if (exists) return;

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Admin@123', salt);

    await User.create({
      full_name: 'Mideye Admin',
      email:     'admin@mideye.com',
      phone:     '+252 615 000000',
      password:  hashedPassword,
      visible_password: 'Admin@123',
      role:      'admin',
    });

    console.log('✅ Default admin account created → admin@mideye.com / Admin@123');
  } catch (err) {
    console.error('Admin seed error:', err.message);
  }
};

// ─── Start ────────────────────────────────────────────────────────────────────
const startServer = async () => {
  await connectDB();
  await seedAdmin();
  await seedFlights();
  await seedCities();

  const server = app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║        Mideye Travel Agency – API Server         ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Status   : Running                              ║`);
    console.log(`║  Port     : ${PORT}                                  ║`);
    console.log(`║  URL      : http://localhost:${PORT}                ║`);
    console.log(`║  Env      : ${(process.env.NODE_ENV || 'development').padEnd(14)}                ║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
    console.log('📡  API Endpoints:');
    console.log(`   POST   /api/auth/register`);
    console.log(`   POST   /api/auth/login`);
    console.log(`   GET    /api/user/profile`);
    console.log(`   GET    /api/user/bookings`);
    console.log(`   GET    /api/user/cargo`);
    console.log(`   GET    /api/user/stats`);
    console.log(`   POST   /api/bookings`);
    console.log(`   POST   /api/cargo`);
    console.log(`   GET    /api/track/:id`);
    console.log(`   GET    /api/admin/stats`);
    console.log(`   GET    /api/admin/users`);
    console.log('');
    console.log('🔐  Default Admin:');
    console.log('   Email  : admin@mideye.com');
    console.log('   Pass   : Admin@123');
    console.log('');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use.`);
      console.error('   Stop the other server first:');
      console.error(`   fuser -k ${PORT}/tcp`);
      console.error('   Or close the other terminal running npm run dev.');
      process.exit(1);
    }
    throw err;
  });
};

startServer();
