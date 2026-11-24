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
    const [result] = await pool.execute(
      'INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
      [name.trim(), email.trim().toLowerCase(), hash, role]
    );
    if (role === 'partner') {
      await pool.execute(
        'INSERT INTO organizations (user_id,name,sector,location) VALUES (?,?,?,?)',
        [result.insertId, organizationName.trim(), sector || null, location || null]
      );
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
    const [rows] = await pool.execute('SELECT id,name,email,password_hash,role FROM users WHERE email=?', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(req.body.password || '', user.password_hash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not sign in.' });
  }
});

export default router;
