# FuturePath — Full-stack University Registration Portal

This version includes a student-facing registration form and a protected administrator dashboard.

## Features
- Responsive student registration form for high school graduates.
- Saves registrations on the server in `data/registrations.json`.
- Admin login with a bcrypt-hashed password.
- Admin dashboard lists student registrations and displays full record details.
- Search and filter by status.
- Admin can update status: Pending, Under Review, Contacted, Accepted, Rejected.
- Export student registrations to CSV.
- Student confirmation includes a unique reference number.

## Requirements
- Node.js 18 or newer (Node.js 20 LTS recommended).
- npm.

## Run locally on Windows
1. Extract the ZIP archive.
2. Open the extracted project folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Run `npm install`.
5. Copy `.env.example` to `.env`. Change `SESSION_SECRET` and `ADMIN_PASSWORD`.
6. Run `npm start`.
7. Open `http://localhost:3000`.
8. Click **Admin login** and sign in using the values in `.env`.
9. Open `http://localhost:3000/admin.html` to see the dashboard after login.

Default development login (only if you did not set `ADMIN_PASSWORD` before the first start):
- Email: `admin@futurepath.local`
- Password: `ChangeMe123!`

The initial admin account is created only when `data/admin.json` does not already exist. To change the admin password, stop the app, delete `data/admin.json`, set a new `ADMIN_PASSWORD` in `.env`, then restart. Keep `.env` private.

## Important production notes
This is a learning/demo starter. It uses a JSON file for persistence, which is suitable only for small demos and a single server process. For a real service, use MySQL or PostgreSQL, HTTPS, a persistent session store, CSRF protection, login rate limiting, validated document uploads with file-size/type restrictions, backups, access controls, and a privacy policy. Do not collect real identity documents or sensitive student data until appropriate security and consent controls are in place. Uploaded files are not implemented; the form only records optional document file names.
