-- Shoe-Taka MySQL database setup
-- Run this file in phpMyAdmin or MySQL Workbench.

CREATE DATABASE IF NOT EXISTS backend
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE backend;

CREATE TABLE IF NOT EXISTS products (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    product VARCHAR(255) NOT NULL,
    buy DECIMAL(10, 2) NOT NULL DEFAULT 0,
    sell DECIMAL(10, 2) NOT NULL DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    image LONGTEXT NULL,
    brand VARCHAR(100) NULL,
    code VARCHAR(100) NULL,
    size JSON NULL,
    description TEXT NULL,
    sellerId VARCHAR(100) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    rejectionReason TEXT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_products_sellerId (sellerId),
    INDEX idx_products_status (status)
) ENGINE=InnoDB;
