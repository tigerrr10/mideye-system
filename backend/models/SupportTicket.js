const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupportTicket = sequelize.define(
  'SupportTicket',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ticket_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    customer_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    source: {
      type: DataTypes.ENUM('whatsapp', 'web', 'booking', 'cargo'),
      defaultValue: 'whatsapp',
    },
    status: {
      type: DataTypes.ENUM('Open', 'In Progress', 'Resolved'),
      defaultValue: 'Open',
    },
    priority: {
      type: DataTypes.ENUM('Normal', 'High'),
      defaultValue: 'Normal',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'support_tickets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = SupportTicket;
