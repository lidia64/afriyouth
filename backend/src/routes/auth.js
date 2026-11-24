import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'youth', organizationName, sector, location } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
      return res.status(400).json({ message: 'Enter your name, email and a password of at least 8 characters.' });
    }
    if (!['youth', 'partner'].includes(role)) return res.status(400).json({ message: 'Invalid account type.' });
    if (role === 'partner' && !organizationName?.trim()) {
      return res.status(400).json({ message: 'Organization name is required.' });
    }
    const hash = await bcrypt.hash(password, 12);
    const connection = await pool.getConnection();
    let userId;
    try {
      await connection.beginTransaction();
      const [roles] = await connection.execute('SELECT id FROM roles WHERE role_name=?', [role]);
      if (!roles[0]) throw new Error('Configured account role is unavailable.');
      const [result] = await connection.execute(
        'INSERT INTO users (role_id,full_name,email,password_hash,account_status) VALUES (?,?,?,?,?)',
        [roles[0].id, name.trim(), email.trim().toLowerCase(), hash, 'active']
      );
      userId = result.insertId;
      let organizationId = null;
      if (role === 'partner') {
        const [organization] = await connection.execute(
          'INSERT INTO organizations (organization_name,email,organization_type,country,is_public,is_verified) VALUES (?,?,?,?,0,0)',
          [organizationName.trim(), email.trim().toLowerCase(), sector || null, location || null]
        );
        organizationId = organization.insertId;
      }
      await connection.execute(
        'INSERT INTO user_profiles (user_id,organization_id,country) VALUES (?,?,?)',
        [userId, organizationId, role === 'youth' ? location || null : null]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    res.status(201).json({ message: 'Account created. You can now sign in.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'An account with this email already exists.' });
    console.error(error);
    res.status(500).json({ message: 'Could not create account.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const [rows] = await pool.execute(`
      SELECT u.id,u.full_name AS name,u.email,u.password_hash,u.account_status,r.role_name AS role
      FROM users u JOIN roles r ON r.id=u.role_id WHERE u.email=?`, [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(req.body.password || '', user.password_hash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    if (user.account_status !== 'active') return res.status(403).json({ message: 'Your account is awaiting approval or is currently unavailable.' });
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not sign in.' });
  }
});

export default router;
