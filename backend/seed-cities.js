const DEFAULT_CITIES = [
  { code: 'MGQ', name: 'Mogadishu' },
  { code: 'HGA', name: 'Hargeisa' },
  { code: 'GLK', name: 'Galkacyo' },
  { code: 'KSM', name: 'Kismayo' },
  { code: 'BDI', name: 'Baidoa' },
];

const seedCities = async () => {
  const { City } = require('./models');
  const count = await City.count();
  if (count > 0) return;

  await City.bulkCreate(DEFAULT_CITIES);
  console.log(`✅ Seeded ${DEFAULT_CITIES.length} default cities`);
};

module.exports = { seedCities, DEFAULT_CITIES };
