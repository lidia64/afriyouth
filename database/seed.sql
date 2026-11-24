USE afriyouth_db;

INSERT INTO programs (title, category, summary, description, audience, duration, is_demo) VALUES
('Innovation Lab', 'Innovation', 'A sample learning pathway for exploring ideas and building prototypes.', 'DEMO CONTENT — An illustrative program concept focused on problem discovery, prototyping and responsible innovation.', 'Young people interested in solving community challenges', 'Illustrative 8-week format', TRUE),
('Digital Skills Studio', 'Digital skills', 'A sample program concept for building practical digital confidence.', 'DEMO CONTENT — An illustrative program concept covering digital literacy, collaboration tools and introductory technology skills.', 'Beginners and emerging digital creators', 'Illustrative 6-week format', TRUE),
('Youth Enterprise Pathway', 'Entrepreneurship', 'A sample pathway for shaping early-stage business ideas.', 'DEMO CONTENT — An illustrative program concept covering customer discovery, business models and pitching.', 'Young people exploring entrepreneurship', 'Illustrative 10-week format', TRUE),
('Sustainable Communities', 'Sustainability', 'A sample program concept for community-led sustainable solutions.', 'DEMO CONTENT — An illustrative program concept exploring environmental challenges and local action.', 'Youth groups and community innovators', 'Illustrative 4-week format', TRUE),
('Leadership in Action', 'Leadership', 'A sample program concept for communication and collaborative leadership.', 'DEMO CONTENT — An illustrative program concept covering teamwork, communication and project planning.', 'Emerging youth leaders', 'Illustrative 5-week format', TRUE);

INSERT INTO publications (title, category, summary, published_on, is_demo) VALUES
('A beginner’s guide to turning ideas into projects', 'Learning guide', 'DEMO CONTENT — Practical prompts for exploring a challenge and shaping an early idea.', CURRENT_DATE, TRUE),
('Digital skills for a changing world', 'Digital skills', 'DEMO CONTENT — An introductory overview of useful digital habits and learning pathways.', CURRENT_DATE, TRUE),
('Young people and sustainable communities', 'Sustainability', 'DEMO CONTENT — Ideas for identifying local sustainability challenges.', CURRENT_DATE, TRUE),
('How to prepare for an opportunity application', 'Career readiness', 'DEMO CONTENT — A general checklist for preparing a clear application.', CURRENT_DATE, TRUE),
('Building confidence through collaboration', 'Leadership', 'DEMO CONTENT — An introductory article about teamwork and shared learning.', CURRENT_DATE, TRUE);
