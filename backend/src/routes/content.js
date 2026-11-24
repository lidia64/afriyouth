import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const router = Router();

router.get('/programs', async (_req, res) => {
  const [rows] = await pool.execute('SELECT * FROM programs ORDER BY created_at DESC');
  res.json(rows);
});

router.get('/resources', async (_req, res) => {
  const [rows] = await pool.execute(`
    SELECT id,title,category,summary,description,resource_type,author,document_url,published_on,is_demo,created_at
    FROM resources ORDER BY published_on DESC, id DESC`);
  res.json(rows);
});
router.get('/resources/:id', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM resources WHERE id=?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Resource not found.' });
  res.json(rows[0]);
});

router.get('/publications', async (_req, res) => {
  const [rows] = await pool.execute(`
    SELECT id,title,category,summary,description,author,document_url,published_on,is_demo,created_at
    FROM publications ORDER BY published_on DESC, id DESC`);
  res.json(rows);
});
router.get('/publications/:id', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM publications WHERE id=?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Publication not found.' });
  res.json(rows[0]);
});

router.get('/opportunities', async (_req, res) => {
  const [rows] = await pool.execute(`
    SELECT o.id,o.title,o.category,o.opportunity_type,o.summary,o.description,o.eligibility,o.location,o.deadline,o.application_url,o.status,o.is_demo,o.created_at,o.updated_at,
           org.name AS organization_name
    FROM opportunities o JOIN organizations org ON org.id=o.organization_id
    WHERE o.status='published' ORDER BY o.created_at DESC`);
  res.json(rows);
});
router.get('/opportunities/:id', async (req, res) => {
  const [rows] = await pool.execute(`
    SELECT o.id,o.title,o.category,o.opportunity_type,o.summary,o.description,o.eligibility,o.location,o.deadline,o.application_url,o.status,o.is_demo,o.created_at,o.updated_at,
           org.name AS organization_name
    FROM opportunities o JOIN organizations org ON org.id=o.organization_id
    WHERE o.id=? AND o.status='published'`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Opportunity not found.' });
  res.json(rows[0]);
});
router.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return res.status(400).json({ message: 'Please complete every field.' });
  }
  await pool.execute('INSERT INTO contact_messages (name,email,subject,message) VALUES (?,?,?,?)',
    [name.trim(), email.trim(), subject.trim(), message.trim()]);
  res.status(201).json({ message: 'Your message has been received.' });
});

router.get('/my/opportunities', requireAuth, allowRoles('partner','admin'), async (req,res) => {
  const [orgs] = await pool.execute('SELECT id FROM organizations WHERE user_id=?', [req.user.id]);
  if (!orgs[0] && req.user.role !== 'admin') return res.json([]);
  const [rows] = req.user.role === 'admin'
    ? await pool.execute('SELECT * FROM opportunities ORDER BY created_at DESC')
    : await pool.execute('SELECT * FROM opportunities WHERE organization_id=? ORDER BY created_at DESC', [orgs[0].id]);
  res.json(rows);
});

router.post('/opportunities', requireAuth, allowRoles('partner'), async (req,res) => {
  const { title, category, opportunity_type, summary, description, eligibility, location, deadline, application_url } = req.body;
  if (!title?.trim() || !category?.trim() || !summary?.trim() || !description?.trim()) {
    return res.status(400).json({ message: 'Title, category, summary and description are required.' });
  }
  const [orgs] = await pool.execute('SELECT id FROM organizations WHERE user_id=?', [req.user.id]);
  if (!orgs[0]) return res.status(400).json({ message: 'Complete your organization profile first.' });
  await pool.execute(
    `INSERT INTO opportunities (organization_id,title,category,opportunity_type,summary,description,eligibility,location,deadline,application_url,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,'pending')`,
    [orgs[0].id,title.trim(),category.trim(),opportunity_type?.trim() || null,summary.trim(),description.trim(),eligibility || null,location || null,deadline || null,application_url || null]
  );
  res.status(201).json({ message: 'Opportunity submitted for review.' });
});

router.post('/opportunities/:id/apply', requireAuth, allowRoles('youth'), async (req,res) => {
  try {
    const [result] = await pool.execute(
      `INSERT INTO applications (opportunity_id,user_id,message)
       SELECT id,?,? FROM opportunities WHERE id=? AND status='published' AND (deadline IS NULL OR deadline >= CURRENT_DATE)`,
      [req.user.id, req.body.message || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(400).json({ message: 'This opportunity is no longer accepting applications.' });
    res.status(201).json({ message: 'Application submitted.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'You have already applied.' });
    console.error(error);
    res.status(500).json({ message: 'Could not submit application.' });
  }
});

router.patch('/admin/opportunities/:id', requireAuth, allowRoles('admin'), async (req,res) => {
  const status = req.body.status;
  if (!['published','rejected','closed'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  await pool.execute('UPDATE opportunities SET status=? WHERE id=?', [status, req.params.id]);
  res.json({ message: `Opportunity ${status}.` });
});

router.get('/dashboard', requireAuth, async (req,res) => {
  if (req.user.role === 'partner') {
    const [rows] = await pool.execute(
      `SELECT o.* FROM opportunities o JOIN organizations g ON g.id=o.organization_id WHERE g.user_id=? ORDER BY o.created_at DESC`,
      [req.user.id]);
    return res.json({ opportunities: rows });
  }
  if (req.user.role === 'youth') {
    const [rows] = await pool.execute(
      `SELECT a.id,a.status,a.created_at,o.title FROM applications a JOIN opportunities o ON o.id=a.opportunity_id WHERE a.user_id=? ORDER BY a.created_at DESC`,
      [req.user.id]);
    return res.json({ applications: rows });
  }
  const [pending] = await pool.execute("SELECT COUNT(*) AS total FROM opportunities WHERE status='pending'");
  const [users] = await pool.execute('SELECT COUNT(*) AS total FROM users');
  res.json({ pendingOpportunities: pending[0].total, users: users[0].total });
});

export default router;
