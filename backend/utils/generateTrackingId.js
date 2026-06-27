const { Cargo } = require('../models');

/**
 * Generates a unique tracking ID in the format MDY-XXXX
 * e.g., MDY-0001, MDY-0002, ...
 */
const generateTrackingId = async () => {
  const lastCargo = await Cargo.findOne({
    order: [['id', 'DESC']],
  });

  let nextNumber = 1;
  if (lastCargo && lastCargo.tracking_id) {
    const parts = lastCargo.tracking_id.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1;
    }
  }

  return `MDY-${String(nextNumber).padStart(4, '0')}`;
};

module.exports = generateTrackingId;
