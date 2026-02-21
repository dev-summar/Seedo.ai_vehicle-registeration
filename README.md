# MIET Jammu - Vehicle Registration

A temporary vehicle registration web application for MIET Jammu, integrated with PI-360 Login API.

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, React Router
- **Backend**: Node.js, Express, MongoDB
- **Auth**: PI-360 JWT (vehicle registration); separate Admin JWT (admin dashboard, 8hr expiry)

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

## Project Structure

```
Seedo.ai-vehicle/
├── client/                 # React frontend
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/    # Layout, etc.
│   │   ├── context/      # Auth context
│   │   └── pages/        # Login, VehicleForm, AdminLogin, AdminDashboard
│   └── ...
├── server/                 # Express backend
│   ├── src/
│   │   ├── config/       # DB, Cloudinary
│   │   ├── controllers/ # adminController
│   │   ├── middleware/  # auth, adminAuth, upload
│   │   ├── models/       # VehicleRegistration, Admin
│   │   ├── routes/       # auth, vehicle, adminRoutes
│   │   └── scripts/      # seedAdmin.js
│   └── ...
├── .env.example
└── README.md
```

## Setup

### 1. Install Dependencies

```bash
npm run install:all
```

Or separately:

```bash
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Environment Variables

**Server** (`server/.env`):

```env
PI360_API_URL=https://pi360.net/site/api/api_login_user_web.php
PI360_INSTITUTE_ID=mietjammu

# JWT secret: must be the SAME secret PI-360 uses to sign the token.
# If you get "invalid signature", get the signing secret from PI-360 and set it here.
JWT_SECRET=your-secure-jwt-secret

MONGODB_URI=mongodb://localhost:27017/miet-vehicle-registration
PORT=5000

MAX_FILE_SIZE=5242880

# Cloudinary (RC file storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Admin dashboard (separate from PI-360)
ADMIN_JWT_SECRET=your-admin-jwt-secret
```

**Client** – use env per environment (no hardcoded URLs):

- `client/.env.development`: `VITE_API_BASE_URL=http://localhost:5000`
- `client/.env.production`: `VITE_API_BASE_URL=https://your-production-domain.com`

Optional fallback: `client/.env` with `VITE_API_URL` or `VITE_API_BASE_URL`. All API calls go through `client/src/services/api.js` (central base URL, token attachment, 401 → logout/redirect).

### 3. MongoDB

Ensure MongoDB is running. For local:

```bash
mongod
```

Or use MongoDB Atlas and set `MONGODB_URI` accordingly.

### 4. Seed first admin (for dashboard)

```bash
cd server && npm run seed:admin
```

Creates admin: `admin@mietjammu.in` / `ChangeMe123`. Change password after first login.

## Run Locally

**Option A: Both together**

```bash
npm run dev
```

**Option B: Separate terminals**

```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

- Frontend: http://localhost:5173  
- Backend: http://localhost:5000

**Verify backend:** `curl http://localhost:5000/api/health` should return `{"ok":true}`

### Troubleshooting: net::ERR on vehicle submit

1. **Backend must be running** – Both `npm run server` and `npm run client` must be active (or use `npm run dev`).
2. **Check browser console** – Look for `[Vehicle API] Request:` log with the request URL.
3. **Check backend terminal** – You should see `[Vehicle] POST /register hit` when submit is clicked.
4. **VITE_API_URL** – Leave empty in dev so Vite proxy forwards `/api` to the backend. If set, use `http://localhost:5000` (no trailing slash).
5. **CORS** – Dev uses Vite proxy (same origin), so CORS should not apply. For direct backend calls, ensure `http://localhost:5173` is allowed.

## API Reference

### POST /api/auth/login

Body (JSON):

```json
{
  "username_1": "email@example.com",
  "password_1": "password",
  "fcm_token": ""
}
```

Returns `{ token, user }` on success (200).  
Errors: 204 (Invalid credentials), 202 (Inactive), 500 (Server error).

### POST /api/vehicle/register

- Headers: `Authorization: Bearer <token>`
- Content-Type: `multipart/form-data`
- Body: `vehicle_number`, `vehicle_type`, `rc_file`, `name`, `email`, `mobile`, `account_type`, `department`

Returns `{ message, id, vehicle_number }` on success (201).

### Admin APIs (separate auth; do not use PI-360)

Admin uses custom email/password stored in `admins` collection and `ADMIN_JWT_SECRET` (8hr expiry).

- **POST /api/admin/login** – Body: `{ email, password }`. Returns `{ status, token, admin: { name, email, role } }`.
- **GET /api/admin/me** – Headers: `Authorization: Bearer <admin_token>`. Returns logged-in admin.
- **GET /api/admin/vehicles** – Query: `?page=1&limit=10&search=keyword&vehicle_type=Two-Wheeler`. Returns `{ status, total, page, limit, totalPages, data }`.
- **GET /api/admin/vehicles/:id/rc** – Redirects to Cloudinary RC URL.

## Admin Dashboard

- **Login:** `/admin/login` (email + password, separate from PI-360).
- **Dashboard:** `/admin/dashboard` (after admin login).
- Token stored as `miet_admin_token`; never mixed with PI-360 token.

## Cloudinary

RC files are stored on Cloudinary (folder: `miet-vehicle-rc`). Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env`. Never expose the API secret to the frontend.

**Migration:** If you have existing records with `rc_path`, run a migration to either remove them or manually upload files to Cloudinary and update to `rc_url`/`cloudinary_public_id`.

## Security

- JWT verification on protected routes
- File type/size validation (PDF, JPG, PNG, max 5MB)
- Files stored outside public directory
- Input sanitization
- SQL injection prevented (Mongoose)

## Production Build

```bash
cd client && npm run build
cd ../server && NODE_ENV=production npm start
```

- Backend serves `client/dist` when `NODE_ENV=production` (single process).
- Set `CLIENT_URL` to your frontend origin (e.g. `https://vehicle.mietjammu.in`) for CORS.
- Set `client/.env.production` with `VITE_API_BASE_URL` to your backend URL (e.g. `https://api.mietjammu.in`).

## Production & Deployment

- **No hardcoded URLs**: Frontend uses `VITE_API_BASE_URL`; backend uses `PORT`, `CLIENT_URL`, `MONGODB_URI`, Cloudinary and JWT from env.
- **Security**: Helmet, rate limiting, compression, CORS from `CLIENT_URL`; Morgan only in dev.
- **Secrets**: Keep `.env` out of git; use `.env.example` as a template; set real secrets in the host (e.g. env vars or secret manager).
- **Tokens**: PI-360 token for vehicle flow; Admin JWT (8h) for dashboard; 401 from API triggers logout and redirect to the correct login page.

## Deployment Checklist

- [ ] Copy `.env.example` to `.env` (root/server and client) and fill in real values.
- [ ] Set `NODE_ENV=production` when running the server.
- [ ] Set `CLIENT_URL` to the production frontend URL.
- [ ] Set `client/.env.production` with `VITE_API_BASE_URL` to the production API URL.
- [ ] Run `cd client && npm run build` and ensure `server` serves `client/dist` (already configured).
- [ ] Ensure `.env` is in `.gitignore` and never committed.
- [ ] Use strong `JWT_SECRET` and `ADMIN_JWT_SECRET`; change default admin password after first login.
- [ ] Optional: use HTTP-only cookies for tokens and tighten CORS to a single origin.
