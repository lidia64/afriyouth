USE afriyouth_db;

-- Optional development examples only. Every inserted listing is explicitly labelled DEMO.
INSERT IGNORE INTO categories (category_name,description) VALUES
  ('Research Reports','DEMO category for research and policy materials.'),
  ('Entrepreneurship Guides','DEMO category for entrepreneurship learning resources.'),
  ('Innovation and Technology','DEMO category for innovation and technology materials.'),
  ('Youth Development','DEMO category for youth development resources.'),
  ('Training Guides and Toolkits','DEMO category for training materials.'),
  ('Sustainable Development','DEMO category for sustainability resources.'),
  ('Policy Briefs','DEMO category for policy publications.'),
  ('Reports and Studies','DEMO category for research publications.'),
  ('Articles and Insights','DEMO category for editorial content.'),
  ('Case Studies','DEMO category for case study publications.'),
  ('Newsletters','DEMO category for newsletters.');

INSERT INTO resources (category_id,title,description,resource_url,status,short_description,published_at,is_demo,is_verified)
SELECT c.id,'DEMO: A Youth Guide to Digital Learning',
  'DEMO CONTENT. An illustrative learning guide for testing the resources library. This is not an official AfriYouth publication.',
  NULL,'published','A clearly labelled development example for the resource card and detail experience.',CURRENT_DATE,1,0
FROM categories c WHERE c.category_name='Youth Development'
  AND NOT EXISTS (SELECT 1 FROM resources WHERE title='DEMO: A Youth Guide to Digital Learning');

INSERT INTO resources (category_id,title,description,resource_url,status,short_description,published_at,is_demo,is_verified)
SELECT c.id,'DEMO: From Idea to First Prototype',
  'DEMO CONTENT. An illustrative prototype guide for testing the resources library. No official program or training is being advertised.',
  NULL,'published','A clearly labelled development example about early-stage prototyping.',CURRENT_DATE,1,0
FROM categories c WHERE c.category_name='Innovation and Technology'
  AND NOT EXISTS (SELECT 1 FROM resources WHERE title='DEMO: From Idea to First Prototype');

INSERT INTO publications (category_id,title,summary,description,author,publisher_name,document_url,published_on,status,is_demo,is_verified)
SELECT c.id,'DEMO: Research and Evidence Sample',
  'A clearly labelled example record for checking the publications listing and detail page.',
  'DEMO CONTENT. This sample is not an AfriYouth research finding or official publication.',
  'Development sample','AfriYouth demo content',NULL,CURRENT_DATE,'published',1,0
FROM categories c WHERE c.category_name='Research Reports'
  AND NOT EXISTS (SELECT 1 FROM publications WHERE title='DEMO: Research and Evidence Sample');

INSERT INTO publications (category_id,title,summary,description,author,publisher_name,document_url,published_on,status,is_demo,is_verified)
SELECT c.id,'DEMO: Policy Brief Sample',
  'A clearly labelled example record for checking policy publication categories and document actions.',
  'DEMO CONTENT. This sample is not an AfriYouth policy position or official publication.',
  'Development sample','AfriYouth demo content',NULL,CURRENT_DATE,'published',1,0
FROM categories c WHERE c.category_name='Policy Briefs'
  AND NOT EXISTS (SELECT 1 FROM publications WHERE title='DEMO: Policy Brief Sample');
