const User = require('./User');
const Booking = require('./Booking');
const Cargo = require('./Cargo');
const Flight = require('./Flight');
const SupportTicket = require('./SupportTicket');
const City = require('./City');

// Associations
User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Cargo, { foreignKey: 'user_id', as: 'cargo_shipments' });
Cargo.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(SupportTicket, { foreignKey: 'user_id', as: 'support_tickets' });
SupportTicket.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = { User, Booking, Cargo, Flight, SupportTicket, City };
