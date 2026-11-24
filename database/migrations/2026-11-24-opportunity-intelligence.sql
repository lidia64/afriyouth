USE afriyouth_db;

-- Run once against the existing AfriYouth database.
ALTER TABLE user_profiles
  ADD COLUMN education TEXT NULL,
  ADD COLUMN skills TEXT NULL,
  ADD COLUMN interests TEXT NULL,
  ADD COLUMN career_goals TEXT NULL;

ALTER TABLE opportunities
  MODIFY COLUMN status ENUM('draft','pending','published','closed','archived','rejected') DEFAULT 'draft';

CREATE TABLE saved_opportunities (
  user_id INT NOT NULL,
  opportunity_id INT NOT NULL,
  saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id,opportunity_id),
  KEY opportunity_id (opportunity_id),
  CONSTRAINT saved_opportunities_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT saved_opportunities_opportunity_fk FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
);
