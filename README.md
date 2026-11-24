# AfriYouth — Youth Innovation Platform

AfriYouth Innovation Labs youth opportunity and development platform, extended in place with the Opportunity Intelligence dashboard and existing MySQL content.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MySQL
- Authentication: JWT + bcrypt
- Design: AfriYouth blue-and-white visual system and responsive layouts

## Requirements
- Node.js 20+
- MySQL 8+ (XAMPP MySQL is suitable)
- npm

## 1. Create the database
For a new database, run `database/schema.sql`, then optionally run `database/seed.sql`. The seed adds only clearly labelled development examples for Resources and Publications; it does not add sample opportunities. To upgrade an existing database that already has the content library, run `database/migrations/2026-11-24-opportunity-intelligence.sql` once. Databases that predate the content-library work should run `2026-11-24-content-library.sql` first, then the Opportunity Intelligence migration. These migrations retain existing user, opportunity and resource records.

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
UPDATE users SET role_id = (SELECT id FROM roles WHERE role_name = 'admin') WHERE email = 'your-email@example.com';
```
Never expose admin role changes to public users.

## Main features
- Public home, about, programs, services, opportunities, resources, publications and contact pages
- Searchable resource, publication and approved opportunity listings with detail pages
- Youth and partner registration/login
- Authenticated dashboards
- Youth profiles with education, skills, interests, location and career goals
- Transparent opportunity matching, saved listings and a private application tracker
- Published learning-resource recommendations for profile gaps
- Organization application review and opportunity management
- Admin opportunity moderation and database-backed impact metrics
- Partners can submit and manage their own opportunities
- Admins can approve/reject submitted opportunities
- Contact messages saved to MySQL
- Demo content seeded into database
- API and frontend separated

## Important content note
Seeded Resources and Publications are marked as demo records and are not official AfriYouth materials. Matching and impact metrics exclude demo content. Opportunities are returned publicly only when their database status is `published`; demo opportunity records retain a visible demo label and cannot accept applications. Demo testimonials are intentionally omitted rather than inventing beneficiary stories.

## Production checklist
- Replace demo content with approved organizational information.
- Set a strong `JWT_SECRET`, database credentials and HTTPS.
- Add email verification, password reset, rate limiting, audit logging and deployment secrets before production.
- Review privacy policy, terms, accessibility and data protection requirements.
- Run `npm run build` in `frontend`.
- Configure the production frontend URL in backend CORS.
