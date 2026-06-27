-- ============================================================
--  Mideye Travel Agency – MySQL Database Schema
--  Run this in phpMyAdmin or MySQL CLI before starting server
-- ============================================================

-- 1. Create & select database
CREATE DATABASE IF NOT EXISTS mideye_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mideye_db;

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  full_name   VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,
  phone       VARCHAR(20)   DEFAULT NULL,
  password    VARCHAR(255)  NOT NULL,
  role        ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT           DEFAULT NULL,
  trip_type        ENUM('oneway','roundtrip') NOT NULL DEFAULT 'oneway',
  passenger_name   VARCHAR(150)  NOT NULL,
  phone            VARCHAR(20)   NOT NULL,
  email            VARCHAR(150)  NOT NULL,
  origin           VARCHAR(10)   NOT NULL,
  destination      VARCHAR(10)   NOT NULL,
  travel_date      DATE          NOT NULL,
  return_date      DATE          DEFAULT NULL,
  adults           TINYINT       NOT NULL DEFAULT 1,
  children         TINYINT       NOT NULL DEFAULT 0,
  infants          TINYINT       NOT NULL DEFAULT 0,
  cabin_class      ENUM('economy','business') NOT NULL DEFAULT 'economy',
  seat_preference  VARCHAR(50)   DEFAULT NULL,
  special_requests TEXT          DEFAULT NULL,
  status           ENUM('Pending','Confirmed','Completed','Cancelled','Delay') NOT NULL DEFAULT 'Pending',
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: cargo
-- ============================================================
CREATE TABLE IF NOT EXISTS cargo (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  tracking_id        VARCHAR(20)   NOT NULL UNIQUE,
  user_id            INT           DEFAULT NULL,
  sender_name        VARCHAR(150)  NOT NULL,
  sender_phone       VARCHAR(20)   NOT NULL,
  sender_email       VARCHAR(150)  DEFAULT NULL,
  sender_address     VARCHAR(255)  DEFAULT NULL,
  recipient_name     VARCHAR(150)  NOT NULL,
  recipient_phone    VARCHAR(20)   NOT NULL,
  origin             VARCHAR(50)   NOT NULL DEFAULT 'Galkacyo (GLK)',
  destination        VARCHAR(10)   NOT NULL,
  cargo_type         VARCHAR(50)   NOT NULL,
  pieces             INT           NOT NULL DEFAULT 1,
  weight             DECIMAL(8,2)  NOT NULL,
  length_cm          DECIMAL(8,2)  DEFAULT NULL,
  width_cm           DECIMAL(8,2)  DEFAULT NULL,
  description        TEXT          DEFAULT NULL,
  shipping_speed     ENUM('standard','express') NOT NULL DEFAULT 'standard',
  insurance          TINYINT(1)    NOT NULL DEFAULT 0,
  fragile            TINYINT(1)    NOT NULL DEFAULT 0,
  signature_required TINYINT(1)    NOT NULL DEFAULT 0,
  special_requests   TEXT          DEFAULT NULL,
  status             ENUM('Pending','Confirmed','Received','Processing','In Transit','Arrived','Ready for Pickup','Delivered','Cancelled') NOT NULL DEFAULT 'Pending',
  cancellation_reason TEXT          DEFAULT NULL,
  delivered_at       DATETIME      DEFAULT NULL,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: flights
-- ============================================================
CREATE TABLE IF NOT EXISTS flights (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  flight_code     VARCHAR(30)   NOT NULL UNIQUE,
  airline         VARCHAR(100)  NOT NULL,
  origin          VARCHAR(10)   NOT NULL,
  destination     VARCHAR(10)   NOT NULL,
  departure_time  VARCHAR(20)   NOT NULL,
  arrival_time    VARCHAR(20)   DEFAULT NULL,
  duration        VARCHAR(20)   NOT NULL,
  schedule_date   DATE          NOT NULL,
  price_economy   DECIMAL(10,2) NOT NULL,
  price_business  DECIMAL(10,2) DEFAULT NULL,
  price_first     DECIMAL(10,2) DEFAULT NULL,
  total_seats     INT           NOT NULL DEFAULT 120,
  available_seats INT           NOT NULL DEFAULT 120,
  status          ENUM('Scheduled','Active','Full','Cancelled','Completed') NOT NULL DEFAULT 'Scheduled',
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: support_tickets
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  ticket_code   VARCHAR(20)   NOT NULL UNIQUE,
  customer_name VARCHAR(150)  NOT NULL,
  phone         VARCHAR(20)   NOT NULL,
  email         VARCHAR(150)  DEFAULT NULL,
  subject       VARCHAR(255)  NOT NULL,
  message       TEXT          NOT NULL,
  source        ENUM('whatsapp','web','booking','cargo') NOT NULL DEFAULT 'whatsapp',
  status        ENUM('Open','In Progress','Resolved') NOT NULL DEFAULT 'Open',
  priority      ENUM('Normal','High') NOT NULL DEFAULT 'Normal',
  user_id       INT           DEFAULT NULL,
  resolved_at   DATETIME      DEFAULT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DEFAULT ADMIN ACCOUNT
-- Password: admin123  (bcrypt hash — change after first login!)
-- ============================================================
INSERT IGNORE INTO users (full_name, email, phone, password, role)
VALUES (
  'Mideye Admin',
  'admin@mideye.so',
  '+252 615 000000',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TsCob7JK7FHrB3UTbj2QL8szDcCi',
  'admin'
);
