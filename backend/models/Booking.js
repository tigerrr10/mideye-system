const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Booking = sequelize.define(
  'Booking',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    flight_record_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    flight_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    trip_type: {
      type: DataTypes.ENUM('oneway', 'roundtrip'),
      defaultValue: 'oneway',
    },
    passenger_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { isEmail: true },
    },
    origin: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    destination: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    travel_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    return_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    adults: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    children: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    infants: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    cabin_class: {
      type: DataTypes.ENUM('economy', 'business'),
      defaultValue: 'economy',
    },
    seat_preference: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    special_requests: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Reject', 'Completed', 'Cancelled', 'Delay', 'Expired'),
      defaultValue: 'Pending',
    },
    ticket_downloaded_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'bookings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Booking;
