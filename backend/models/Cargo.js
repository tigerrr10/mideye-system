const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { CARGO_STATUSES, CARGO_STATUS_DEFAULT } = require('../utils/cargoStatuses');

const Cargo = sequelize.define(
  'Cargo',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tracking_id: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    sender_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    sender_phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    sender_email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    sender_address: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    recipient_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    recipient_phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    origin: {
      type: DataTypes.STRING(50),
      defaultValue: 'Galkacyo (GLK)',
    },
    destination: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    cargo_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    pieces: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    weight: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
    },
    length_cm: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    width_cm: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    shipping_speed: {
      type: DataTypes.ENUM('standard', 'express'),
      defaultValue: 'standard',
    },
    insurance: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    fragile: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    signature_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    special_requests: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...CARGO_STATUSES),
      defaultValue: CARGO_STATUS_DEFAULT,
    },
    cancellation_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'cargo',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Cargo;
