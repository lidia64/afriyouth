import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pool } from './db.js';
import authRoutes from './routes/auth.js';
import contentRoutes from './routes/content.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', async (_req,res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); }
  catch { res.status(503).json({ status: 'error', database: 'unavailable' }); }
});
app.use('/api/auth', authRoutes);
app.use('/api', contentRoutes);
app.use((error,_req,res,_next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong.' });
});
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`AfriYouth API running on http://localhost:${port}`));
