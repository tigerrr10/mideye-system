const fs = require('fs');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// On Windows, "localhost" often resolves to ::1 while XAMPP MySQL listens on IPv4.
const dbHost = !process.env.DB_HOST || process.env.DB_HOST === 'localhost'
  ? '127.0.0.1'
  : process.env.DB_HOST;

const FALLBACK_PORTS = [3306, 3307];
const SOCKET_PATHS = [
  process.env.DB_SOCKET,
  '/var/run/mysqld/mysqld.sock',
].filter(Boolean);
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const baseConfig = {
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
};

const buildSequelize = ({ port, socketPath, database } = {}) => {
  const config = { ...baseConfig };

  if (socketPath) {
    config.dialectOptions = { socketPath };
  } else {
    config.host = dbHost;
    config.port = port || Number(process.env.DB_PORT) || 3306;
  }

  return new Sequelize(
    database ?? process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    config
  );
};

let sequelize = buildSequelize({ port: Number(process.env.DB_PORT) || 3306 });

const ensureDatabaseExists = async ({ port, socketPath } = {}) => {
  const admin = buildSequelize({ port, socketPath, database: '' });

  try {
    await admin.authenticate();
    await admin.query(
      `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await admin.close();
  }
};

const getPortsToTry = () => {
  const configured = Number(process.env.DB_PORT) || 3306;
  return [...new Set([configured, ...FALLBACK_PORTS])];
};

const getSocketsToTry = () => SOCKET_PATHS.filter((socketPath) => fs.existsSync(socketPath));

const applyConnectionTarget = ({ port, socketPath }) => {
  if (socketPath) {
    sequelize.options.host = undefined;
    sequelize.options.port = undefined;
    sequelize.options.dialectOptions = { socketPath };
    if (sequelize.connectionManager.config) {
      delete sequelize.connectionManager.config.host;
      delete sequelize.connectionManager.config.port;
      sequelize.connectionManager.config.dialectOptions = { socketPath };
    }
    return;
  }

  sequelize.options.host = dbHost;
  sequelize.options.port = port;
  delete sequelize.options.dialectOptions;
  if (sequelize.connectionManager.config) {
    sequelize.connectionManager.config.host = dbHost;
    sequelize.connectionManager.config.port = port;
    delete sequelize.connectionManager.config.dialectOptions;
  }
};

const tryEndpoint = async ({ port, socketPath }) => {
  await ensureDatabaseExists({ port, socketPath });
  applyConnectionTarget({ port, socketPath });
  await sequelize.authenticate();

  if (socketPath) {
    console.log(`ℹ️  MySQL connected via socket: ${socketPath}`);
    return { socketPath };
  }

  if (port !== Number(process.env.DB_PORT)) {
    console.log(`ℹ️  MySQL found on port ${port} (DB_PORT in .env was ${process.env.DB_PORT || 'unset'})`);
  }

  return { port };
};

const closeConnectionManager = async () => {
  try {
    await sequelize.connectionManager.close();
  } catch (_) {
    // ignore close errors while probing endpoints
  }
};

const tryConnect = async () => {
  const ports = getPortsToTry();
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    for (const port of ports) {
      try {
        return await tryEndpoint({ port });
      } catch (error) {
        lastError = error;
        await closeConnectionManager();
      }
    }

    for (const socketPath of getSocketsToTry()) {
      try {
        return await tryEndpoint({ socketPath });
      } catch (error) {
        lastError = error;
        await closeConnectionManager();
      }
    }

    if (attempt < MAX_RETRIES) {
      console.log(`⏳ Waiting for MySQL... (attempt ${attempt}/${MAX_RETRIES})`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw lastError;
};

const connectDB = async () => {
  try {
    const endpoint = await tryConnect();
    const label = endpoint.socketPath
      ? endpoint.socketPath
      : `${dbHost}:${endpoint.port}`;
    console.log(`✅ MySQL connected successfully via Sequelize (${label})`);

    await sequelize.sync({ alter: false });

    const [cols] = await sequelize.query("SHOW COLUMNS FROM users LIKE 'is_active'");
    if (!cols.length) {
      await sequelize.query(
        'ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role'
      );
      console.log('✅ Added is_active column to users table');
    }

    const [cargoCancelCol] = await sequelize.query("SHOW COLUMNS FROM cargo LIKE 'cancellation_reason'");
    if (!cargoCancelCol.length) {
      await sequelize.query(
        'ALTER TABLE cargo ADD COLUMN cancellation_reason TEXT DEFAULT NULL AFTER status'
      );
      console.log('✅ Added cancellation_reason column to cargo table');
    }

    const [cargoDeliveredCol] = await sequelize.query("SHOW COLUMNS FROM cargo LIKE 'delivered_at'");
    if (!cargoDeliveredCol.length) {
      await sequelize.query(
        'ALTER TABLE cargo ADD COLUMN delivered_at DATETIME DEFAULT NULL AFTER cancellation_reason'
      );
      console.log('✅ Added delivered_at column to cargo table');
    }

    const [cargoStatusCol] = await sequelize.query("SHOW COLUMNS FROM cargo LIKE 'status'");
    if (cargoStatusCol.length) {
      const type = cargoStatusCol[0].Type || '';
      if (!type.includes('Ready for Pickup')) {
        await sequelize.query(`
          ALTER TABLE cargo
          MODIFY COLUMN status ENUM(
            'Pending','Confirmed','Received','Processing',
            'In Transit','Arrived','Ready for Pickup','Delivered','Cancelled'
          ) NOT NULL DEFAULT 'Pending'
        `);
        console.log('✅ Expanded cargo status workflow ENUM');
      }
    }

    const [roleCol] = await sequelize.query("SHOW COLUMNS FROM users LIKE 'role'");
    if (roleCol.length && !(roleCol[0].Type || '').includes('staff')) {
      await sequelize.query(`
        ALTER TABLE users
        MODIFY COLUMN role ENUM('user','admin','staff') NOT NULL DEFAULT 'user'
      `);
      console.log('✅ Added staff role to users table');
    }

    const [ticketDownloadCol] = await sequelize.query("SHOW COLUMNS FROM bookings LIKE 'ticket_downloaded_at'");
    if (!ticketDownloadCol.length) {
      await sequelize.query(
        'ALTER TABLE bookings ADD COLUMN ticket_downloaded_at DATETIME DEFAULT NULL AFTER status'
      );
      console.log('✅ Added ticket_downloaded_at column to bookings table');
    }

    console.log('✅ Database tables synced');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('');
    console.error('   Fix checklist:');
    console.error('   1. Start MySQL (pick one):');
    console.error('        sudo systemctl start mysql');
    console.error('        sudo /opt/lampp/lampp startmysql   # if using XAMPP');
    console.error('   2. Check port:   ss -tlnp | grep 3306');
    console.error('   3. Update .env:  DB_PORT=3306 (Linux) or DB_PORT=3307 (XAMPP on Windows)');
    console.error(`   4. Create DB:    mysql -u root -e "CREATE DATABASE ${process.env.DB_NAME};"`);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
