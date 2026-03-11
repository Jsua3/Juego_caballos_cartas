-- Carrera de Caballos — MySQL Schema
-- Ejecutar en HeidiSQL sobre la base de datos 'caballos'

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  points        INT DEFAULT 1000,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_rooms (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  room_code   VARCHAR(8) UNIQUE NOT NULL,
  status      VARCHAR(20) DEFAULT 'waiting',
  max_players INT DEFAULT 4,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS room_players (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  room_id       INT,
  user_id       INT,
  bet_suit      VARCHAR(20),
  bet_amount    INT,
  points_before INT,
  points_after  INT,
  is_ready      BOOLEAN DEFAULT FALSE,
  joined_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES game_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT,
  type        VARCHAR(20),
  amount      INT,
  description TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS redemption_codes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  code       VARCHAR(20) UNIQUE NOT NULL,
  points     INT DEFAULT 1000,
  used_by    INT NULL,
  used_at    TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (used_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS point_purchases (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT,
  points_bought INT DEFAULT 1000,
  price_cop     INT DEFAULT 10000,
  status        VARCHAR(20) DEFAULT 'pending',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
