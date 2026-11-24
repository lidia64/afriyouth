USE afriyouth_db;

-- Run once on databases created before the content library update.
ALTER TABLE publications
  ADD COLUMN description TEXT NULL AFTER summary,
  ADD COLUMN author VARCHAR(180) NULL AFTER description,
  ADD COLUMN document_url VARCHAR(1000) NULL AFTER author;

ALTER TABLE opportunities
  ADD COLUMN opportunity_type VARCHAR(80) NULL AFTER category;

CREATE TABLE IF NOT EXISTS resources (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  category VARCHAR(100) NOT NULL,
  summary VARCHAR(500) NOT NULL,
  description TEXT NULL,
  resource_type VARCHAR(80) NOT NULL DEFAULT 'Resource',
  author VARCHAR(180) NULL,
  document_url VARCHAR(1000) NULL,
  published_on DATE NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
