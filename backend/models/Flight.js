const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { FLIGHT_STATUSES, FLIGHT_STATUS_DEFAULT } = require('../utils/flightStatuses');

const Flight = sequelize.define(
  'Flight',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    flight_code: {
      type: DataTypes.STRING(30),
      unique: true,
      allowNull: false,
    },
    airline: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    origin: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    destination: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    departure_time: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    arrival_time: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    duration: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    schedule_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    price_economy: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    price_business: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    price_first: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    total_seats: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 120,
    },
    available_seats: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 120,
    },
    status: {
      type: DataTypes.ENUM(...FLIGHT_STATUSES),
      defaultValue: FLIGHT_STATUS_DEFAULT,
    },
  },
  {
    tableName: 'flights',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Flight;
