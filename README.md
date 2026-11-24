# AfriYouth — Youth Innovation Platform

A fresh, standalone starter implementation based on the AfriYouth requirements discussed with ChatGPT. It is not a copy of an existing local project and does not contain your existing database records.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MySQL
- Authentication: JWT + bcrypt
- Design: blue-only visual system, responsive layouts, animated full-screen hero

## Requirements
- Node.js 20+
- MySQL 8+ (XAMPP MySQL is suitable)
- npm

## 1. Create the database
Open phpMyAdmin or MySQL and run `database/schema.sql`, then run `database/seed.sql`.

The seed data is explicitly demo content. Replace it with verified AfriYouth information before presenting it as official.

## 2. Configure the backend
```bash
cd backend
copy .env.example .env
npm install
npm run dev
```
Edit `.env` with your MySQL username/password and a strong JWT secret. Default XAMPP settings are often `127.0.0.1`, port `3306`, user `root`, blank password, but check your own setup.

Backend: http://localhost:5000

## 3. Configure the frontend
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:5173

## Demo accounts
The seed script does not create accounts with known passwords. Register a youth or partner account through the website. To create an admin, register normally, then manually update that user's role to `admin` in a trusted local database:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```
Never expose admin role changes to public users.

## Main features
- Public home, about, programs, services, opportunities, publications and contact pages
- Youth and partner registration/login
- Authenticated dashboards
- Partners can create and manage their own opportunities
- Admins can approve/reject submitted opportunities
- Contact messages saved to MySQL
- Demo content seeded into database
- API and frontend separated

## Important content note
Program descriptions, organizations, publications and opportunities included in the seed are illustrative demo records. They are not verified AfriYouth programs, partnerships, deadlines or live application calls. Demo testimonials are intentionally omitted rather than inventing beneficiary stories.

## Production checklist
- Replace demo content with approved organizational information.
- Set a strong `JWT_SECRET`, database credentials and HTTPS.
- Add email verification, password reset, rate limiting, audit logging and deployment secrets before production.
- Review privacy policy, terms, accessibility and data protection requirements.
- Run `npm run build` in `frontend`.
- Configure the production frontend URL in backend CORS.
