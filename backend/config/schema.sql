-- SCAN&GOO Database Schema
-- Run this file to initialize your database:
--   mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS scangoo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE scangoo_db;

-- ─── USERS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name   VARCHAR(100) NOT NULL,
  phone       VARCHAR(20)  NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('shopper','admin') DEFAULT 'shopper',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── PRODUCTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(30)  NOT NULL UNIQUE,
  barcode         VARCHAR(50)  NOT NULL UNIQUE,
  name            VARCHAR(150) NOT NULL,
  emoji           VARCHAR(10)  DEFAULT '🛒',
  price           INT UNSIGNED NOT NULL COMMENT 'Price in RWF',
  weight_kg       DECIMAL(6,3) NOT NULL DEFAULT 0,
  category        VARCHAR(60)  DEFAULT 'General',
  age_restricted  TINYINT(1)   DEFAULT 0,
  in_stock        TINYINT(1)   DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── SHOPPING SESSIONS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id          VARCHAR(36)  PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  status      ENUM('active','paying','completed','abandoned') DEFAULT 'active',
  started_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at    TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── SESSION ITEMS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_items (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id  VARCHAR(36)  NOT NULL,
  product_id  INT UNSIGNED NOT NULL,
  qty         INT UNSIGNED NOT NULL DEFAULT 1,
  unit_price  INT UNSIGNED NOT NULL COMMENT 'Price at time of scan',
  scanned_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  UNIQUE KEY uq_sess_prod (session_id, product_id)
);

-- ─── TRANSACTIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id              VARCHAR(36)  PRIMARY KEY,
  session_id      VARCHAR(36)  NOT NULL,
  user_id         INT UNSIGNED NOT NULL,
  total_amount    INT UNSIGNED NOT NULL,
  total_weight    DECIMAL(8,3) NOT NULL DEFAULT 0,
  payment_method  ENUM('momo','airtel','cash') NOT NULL,
  payment_phone   VARCHAR(20)  NULL,
  status          ENUM('pending','success','failed') DEFAULT 'pending',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (user_id)    REFERENCES users(id)
);

-- ─── ALERTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type        ENUM('price_mismatch','age_restricted','weight_exceeded','system') DEFAULT 'system',
  icon        VARCHAR(10)  DEFAULT '⚠️',
  title       VARCHAR(200) NOT NULL,
  detail      VARCHAR(500) DEFAULT '',
  session_id  VARCHAR(36)  NULL,
  resolved    TINYINT(1)   DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── SEED DATA ──────────────────────────────────────────────────────────────

-- Admin user (password: admin123)
INSERT IGNORE INTO users (full_name, phone, password, role) VALUES
('Admin User', '+250788000000', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Shopper user (password: password123)
INSERT IGNORE INTO users (full_name, phone, password, role) VALUES
('Amahoro Jean', '+250788123456', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'shopper');

-- Products
INSERT IGNORE INTO products (code, barcode, name, emoji, price, weight_kg, category, age_restricted) VALUES
('P001', '6001254001234', 'Indomie Noodles',     '🍜', 350,  0.075, 'Food',      0),
('P002', '6001254002345', 'Milk 1L',              '🥛', 800,  1.000, 'Dairy',     0),
('P003', '6001254003456', 'Mineral Water 500ml',  '💧', 300,  0.500, 'Beverages', 0),
('P004', '6001254004567', 'Primus Beer 500ml',    '🍺', 1200, 0.500, 'Alcohol',   1),
('P005', '6001254005678', 'Bread (White Loaf)',   '🍞', 1000, 0.400, 'Bakery',    0),
('P006', '6001254006789', 'Cooking Oil 500ml',    '🫙', 2500, 0.500, 'Cooking',   0),
('P007', '6001254007890', 'Sugar 1kg',            '🧂', 900,  1.000, 'Cooking',   0),
('P008', '6001254008901', 'Eggs (Tray 12)',       '🥚', 2400, 0.700, 'Dairy',     0),
('P009', '6001254009012', 'Rice 1kg',             '🍚', 1200, 1.000, 'Food',      0),
('P010', '6001254010123', 'Tomato Paste 400g',    '🥫', 650,  0.400, 'Food',      0);

-- Seed alert
INSERT IGNORE INTO alerts (type, icon, title, detail) VALUES
('price_mismatch', '🥛', 'Milk 1L — Price mismatch', 'Shelf tag: 800 RWF → System: 900 RWF');
