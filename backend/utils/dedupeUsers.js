const { sequelize } = require('../config/database');
const { User, Booking, Cargo } = require('../models');

/**
 * Normalizes emails and merges duplicate user accounts (same email, case-insensitive).
 * Keeps the oldest account (lowest id) and reassigns bookings/cargo to it.
 */
const dedupeUsers = async () => {
  const users = await User.findAll({ order: [['id', 'ASC']] });

  for (const user of users) {
    const normalized = user.email.trim().toLowerCase();
    if (user.email !== normalized) {
      await user.update({ email: normalized });
    }
  }

  const [groups] = await sequelize.query(`
    SELECT LOWER(email) AS email_key,
           GROUP_CONCAT(id ORDER BY id ASC) AS ids,
           COUNT(*) AS cnt
    FROM users
    GROUP BY LOWER(email)
    HAVING cnt > 1
  `);

  let merged = 0;
  for (const group of groups) {
    const ids = group.ids.split(',').map(Number);
    const keepId = ids[0];
    const removeIds = ids.slice(1);

    for (const dupId of removeIds) {
      await Booking.update({ user_id: keepId }, { where: { user_id: dupId } });
      await Cargo.update({ user_id: keepId }, { where: { user_id: dupId } });
      await User.destroy({ where: { id: dupId } });
      merged += 1;
    }

    console.log(`✅ Merged duplicate email "${group.email_key}" → kept user #${keepId}`);
  }

  const primaryAdmin = await User.findOne({ where: { email: 'admin@mideye.com' } });
  const legacyAdmin = await User.findOne({ where: { email: 'admin@mideye.so' } });
  if (primaryAdmin && legacyAdmin) {
    await legacyAdmin.destroy();
    console.log('✅ Removed duplicate admin account admin@mideye.so');
    merged += 1;
  }

  if (merged === 0 && !groups.length) {
    console.log('✅ No duplicate users found');
  }
};

module.exports = dedupeUsers;
