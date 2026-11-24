import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { pool } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const router = Router();
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const publicOpportunitySelect = `
  SELECT o.id,o.title,c.category_name AS category,o.opportunity_type,
    COALESCE(o.short_description,o.description) AS summary,o.description,o.eligibility,o.location,
    o.closing_date AS deadline,o.application_url,o.application_instructions,o.status,o.is_demo,o.is_verified,
    o.published_at AS created_at,o.closing_date AS updated_at,
    COALESCE(NULLIF(org.organization_name,''),NULLIF(o.publisher_name,'')) AS organization_name
  FROM opportunities o
  LEFT JOIN categories c ON c.id=o.category_id
  LEFT JOIN user_profiles up ON up.user_id=o.created_by
  LEFT JOIN organizations org ON org.id=up.organization_id`;

router.get('/programs', asyncRoute(async (_req, res) => {
  const [rows] = await pool.execute(`
    SELECT p.id,p.title,c.category_name AS category,
      COALESCE(p.objectives,p.description) AS summary,p.description,
      p.target_audience AS audience,p.duration,p.is_demo,p.start_date,p.end_date,p.location
    FROM programs p LEFT JOIN categories c ON c.id=p.category_id
    WHERE p.status='published' ORDER BY p.start_date DESC,p.id DESC`);
  res.json(rows);
}));

router.get('/resources', asyncRoute(async (_req, res) => {
  const [rows] = await pool.execute(`
    SELECT r.id,r.title,c.category_name AS category,
      COALESCE(r.short_description,r.description) AS summary,r.description,
      m.file_type AS resource_type,u.full_name AS author,r.resource_url AS document_url,
      r.published_at AS published_on,r.is_demo,r.is_verified
    FROM resources r
    LEFT JOIN categories c ON c.id=r.category_id
    LEFT JOIN media_assets m ON m.id=r.media_id
    LEFT JOIN users u ON u.id=r.created_by
    WHERE r.status='published'
    ORDER BY r.published_at DESC,r.id DESC`);
  res.json(rows);
}));
router.get('/resources/:id', asyncRoute(async (req, res) => {
  const [rows] = await pool.execute(`
    SELECT r.id,r.title,c.category_name AS category,
      COALESCE(r.short_description,r.description) AS summary,r.description,
      m.file_type AS resource_type,u.full_name AS author,r.resource_url AS document_url,
      r.published_at AS published_on,r.is_demo,r.is_verified
    FROM resources r
    LEFT JOIN categories c ON c.id=r.category_id
    LEFT JOIN media_assets m ON m.id=r.media_id
    LEFT JOIN users u ON u.id=r.created_by
    WHERE r.id=? AND r.status='published'`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Resource not found.' });
  res.json(rows[0]);
}));

router.get('/publications', asyncRoute(async (_req, res) => {
  const [rows] = await pool.execute(`
    SELECT p.id,p.title,c.category_name AS category,p.summary,p.description,
      COALESCE(NULLIF(p.author,''),NULLIF(p.publisher_name,''),org.organization_name) AS author,
      p.document_url,p.published_on,p.is_demo,p.is_verified,p.created_at
    FROM publications p
    LEFT JOIN categories c ON c.id=p.category_id
    LEFT JOIN user_profiles up ON up.user_id=p.created_by
    LEFT JOIN organizations org ON org.id=up.organization_id
    WHERE p.status='published'
    ORDER BY p.published_on DESC,p.id DESC`);
  res.json(rows);
}));
router.get('/publications/:id', asyncRoute(async (req, res) => {
  const [rows] = await pool.execute(`
    SELECT p.id,p.title,c.category_name AS category,p.summary,p.description,
      COALESCE(NULLIF(p.author,''),NULLIF(p.publisher_name,''),org.organization_name) AS author,
      p.document_url,p.published_on,p.is_demo,p.is_verified,p.created_at
    FROM publications p
    LEFT JOIN categories c ON c.id=p.category_id
    LEFT JOIN user_profiles up ON up.user_id=p.created_by
    LEFT JOIN organizations org ON org.id=up.organization_id
    WHERE p.id=? AND p.status='published'`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Publication not found.' });
  res.json(rows[0]);
}));

router.get('/opportunities', asyncRoute(async (_req, res) => {
  const [rows] = await pool.execute(`${publicOpportunitySelect} WHERE o.status='published' ORDER BY o.published_at DESC,o.id DESC`);
  res.json(rows);
}));
router.get('/opportunities/:id', asyncRoute(async (req, res) => {
  const [rows] = await pool.execute(`${publicOpportunitySelect} WHERE o.id=? AND o.status='published'`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Opportunity not found.' });
  res.json(rows[0]);
}));

router.post('/contact', asyncRoute(async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return res.status(400).json({ message: 'Please complete every field.' });
  }
  await pool.execute(`INSERT INTO contact_messages (sender_name,sender_email,subject,message) VALUES (?,?,?,?)`,
    [name.trim(), email.trim(), subject.trim(), message.trim()]);
  res.status(201).json({ message: 'Your message has been received.' });
}));

router.get('/my/opportunities', requireAuth, allowRoles('partner','admin'), asyncRoute(async (req,res) => {
  const [rows] = req.user.role === 'admin'
    ? await pool.execute('SELECT * FROM opportunities ORDER BY id DESC')
    : await pool.execute('SELECT * FROM opportunities WHERE created_by=? ORDER BY id DESC', [req.user.id]);
  res.json(rows);
}));

router.post('/opportunities', requireAuth, allowRoles('partner'), asyncRoute(async (req,res) => {
  const { title, category, opportunity_type, summary, description, eligibility, location, deadline, application_url } = req.body;
  if([title,category,summary,description].some(value=>typeof value!=='string') || [opportunity_type,eligibility,location,deadline,application_url].some(value=>value!=null && typeof value!=='string')) {
    return res.status(400).json({message:'Opportunity fields must be text.'});
  }
  if (!title?.trim() || !category?.trim() || !summary?.trim() || !description?.trim()) {
    return res.status(400).json({ message: 'Title, category, summary and description are required.' });
  }
  if(title.trim().length>200 || category.trim().length>100 || summary.trim().length>500 || description.length>30000 || (opportunity_type?.trim().length||0)>80 || (location?.trim().length||0)>200) {
    return res.status(400).json({message:'One or more opportunity fields exceed the supported length.'});
  }
  if(deadline) {
    const parsedDate=new Date(`${deadline}T00:00:00Z`);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10)!==deadline) return res.status(400).json({message:'Enter a valid application deadline.'});
  }
  if(application_url?.trim()) {
    try { const parsed=new URL(application_url.trim()); if(!['http:','https:'].includes(parsed.protocol)) throw new Error('protocol'); }
    catch { return res.status(400).json({message:'Application URL must use http or https.'}); }
    if(application_url.trim().length>500) return res.status(400).json({message:'Application URL is too long.'});
  }
  let [categories] = await pool.execute('SELECT id FROM categories WHERE category_name=?', [category.trim()]);
  if (!categories[0]) {
    await pool.execute('INSERT INTO categories (category_name) VALUES (?)', [category.trim()]);
    [categories] = await pool.execute('SELECT id FROM categories WHERE category_name=?', [category.trim()]);
  }
  const slugBase = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 150) || 'opportunity';
  const slug = `${slugBase}-${randomUUID().slice(0, 8)}`;
  await pool.execute(`
    INSERT INTO opportunities
      (category_id,created_by,title,slug,description,eligibility,location,application_url,closing_date,status,short_description,publisher_name,opportunity_type)
    VALUES (?,?,?,?,?,?,?,?,?,'pending',?,?,?)`,
    [categories[0].id,req.user.id,title.trim(),slug,description.trim(),eligibility || null,location || null,application_url || null,deadline || null,summary.trim(),req.user.name || null,opportunity_type?.trim() || null]);
  res.status(201).json({ message: 'Opportunity submitted for review.' });
}));

router.post('/opportunities/:id/apply', requireAuth, allowRoles('youth'), asyncRoute(async (req,res) => {
  const message=typeof req.body.message==='string' ? req.body.message.trim() : '';
  if(message.length>5000) return res.status(400).json({message:'Your application note must be 5,000 characters or fewer.'});
  try {
    const [result] = await pool.execute(`
      INSERT INTO applications (user_id,opportunity_id,cover_letter)
      SELECT ?,id,? FROM opportunities
      WHERE id=? AND status='published' AND is_demo=0 AND (closing_date IS NULL OR closing_date >= CURRENT_DATE)`,
      [req.user.id, message || null, req.params.id]);
    if (!result.affectedRows) return res.status(400).json({ message: 'This opportunity is no longer accepting applications.' });
    res.status(201).json({ message: 'Application submitted.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'You have already applied.' });
    throw error;
  }
}));

router.patch('/admin/opportunities/:id', requireAuth, allowRoles('admin'), asyncRoute(async (req,res) => {
  const status = req.body.status;
  if (!['published','closed','archived','pending','draft','rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  const rejectionReason=typeof req.body.rejection_reason==='string' ? req.body.rejection_reason.trim().slice(0,255) : null;
  await pool.execute(`UPDATE opportunities SET status=?,published_at=IF(?='published',CURRENT_DATE,published_at),
    rejection_reason=IF(?='rejected',?,NULL) WHERE id=?`, [status,status,status,rejectionReason,req.params.id]);
  res.json({ message: `Opportunity ${status}.` });
}));

router.get('/dashboard', requireAuth, asyncRoute(async (req,res) => {
  if (req.user.role === 'partner') {
    const [rows] = await pool.execute('SELECT * FROM opportunities WHERE created_by=? ORDER BY id DESC', [req.user.id]);
    return res.json({ opportunities: rows });
  }
  if (req.user.role === 'youth') {
    const [rows] = await pool.execute(`
      SELECT a.id,a.application_status AS status,a.submitted_at AS created_at,o.title
      FROM applications a JOIN opportunities o ON o.id=a.opportunity_id
      WHERE a.user_id=? ORDER BY a.submitted_at DESC`, [req.user.id]);
    return res.json({ applications: rows });
  }
  const [[pending]] = await pool.execute("SELECT COUNT(*) AS total FROM opportunities WHERE status='pending'");
  const [[users]] = await pool.execute("SELECT COUNT(*) AS total FROM users WHERE account_status='active'");
  res.json({ pendingOpportunities: pending.total, users: users.total });
}));

export default router;
