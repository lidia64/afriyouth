USE afriyouth_db;

-- Run once on the existing AfriYouth content database.
ALTER TABLE opportunities
  ADD COLUMN opportunity_type VARCHAR(80) NULL AFTER category_id;

CREATE TABLE IF NOT EXISTS publications (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  category_id INT NULL,
  media_id INT NULL,
  created_by INT NULL,
  title VARCHAR(200) NOT NULL,
  summary VARCHAR(500) NOT NULL,
  description TEXT NULL,
  author VARCHAR(180) NULL,
  publisher_name VARCHAR(200) NULL,
  document_url VARCHAR(1000) NULL,
  published_on DATE NULL,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  is_demo TINYINT(1) NOT NULL DEFAULT 0,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY category_id (category_id),
  KEY media_id (media_id),
  KEY created_by (created_by),
  CONSTRAINT publications_category_fk FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT publications_media_fk FOREIGN KEY (media_id) REFERENCES media_assets(id) ON DELETE SET NULL,
  CONSTRAINT publications_user_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
