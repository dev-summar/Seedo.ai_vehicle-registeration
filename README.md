# MIET Jammu – Vehicle Registration

Web application for temporary vehicle registration at MIET Jammu. Users sign in with **PI-360 credentials**; the backend validates against the PI-360 API and issues a JWT. Admins use a separate dashboard with email/password auth.

---

## Features

- **User login** – Sign in with your PI-360 Credentials (email/password validated via PI-360 API).
- **Vehicle registration** – Submit vehicle details and RC document (PDF/image); optional Surepass RC verification.
- **Admin dashboard** – Separate login; view, search, and filter registrations; download RC files (Cloudinary).
- **Security** – JWT for users (PI-360) and admins (8h expiry), file validation, rate limiting, Helmet, CORS.

---

## Tech Stack

| Layer    | Stack |
|----------|--------|
| Frontend | React 18, Vite, TailwindCSS, React Router, Lucide React |
| Backend  | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Auth     | PI-360 JWT (users); custom Admin JWT (dashboard) |
| Storage  | Cloudinary (RC documents) |

---

## Prerequisites

- **Node.js** 18+
- **MongoDB** (local or Atlas)
- **npm** (or yarn)

---

## Project Structure

```
Seedo.ai_vehicle-registeration/
├── client/                    # React frontend
│   ├── public/                # favicon, static assets
│   ├── src/
│   │   ├── api/               # client.js, adminClient.js
│   │   ├── components/       # Layout, AdminLayout, Spinner
│   │   ├── context/           # AuthContext, AdminAuthContext
│   │   ├── pages/             # Login, VehicleForm, AdminLogin, AdminDashboard
│   │   └── services/          # api.js (base URL, auth headers)
│   └── index.html
├── server/                    # Express backend
│   ├── src/
│   │   ├── config/            # db.js, roleCache.js
│   │   ├── controllers/       # adminController.js
│   │   ├── middleware/        # auth.js, adminAuth.js
│   │   ├── models/            # VehicleRegistration, Admin
│   │   ├── routes/            # auth, vehicle, adminRoutes
│   │   └── services/          # surepassService.js (RC verification)
│   ├── scripts/               # seedAdmin.js, resetAdmin.js
│   └── .env
├── package.json               # Root scripts: dev, server, client, install:all
└── README.md
```

---

## Setup

### 1. Install dependencies

From the project root:

```bash
npm run install:all
```

Or manually:

```bash
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Environment variables

**Server** – copy `server/.env.example` to `server/.env` (or create `.env`) and set:

| Variable | Description |
|----------|-------------|
| `PI360_API_URL` | PI-360 login API URL (e.g. `https://pi360.net/site/api/api_login_user_web.php`) |
| `PI360_INSTITUTE_ID` | Institute ID (e.g. `mietjammu`) |
| `JWT_SECRET` | **Same secret PI-360 uses** to sign tokens; required for verification |
| `MONGODB_URI` | MongoDB connection string |
| `PORT` | Server port (e.g. `5000`) |
| `ADMIN_JWT_SECRET` | Secret for admin JWT (dashboard) |
| `CLIENT_URL` | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `SUREPASS_API_URL` | (Optional) Surepass RC API URL |
| `SUREPASS_API_KEY` | (Optional) Surepass API key |
| `RATE_LIMIT_MAX` | (Optional) Global rate limit |
| `VEHICLE_REGISTER_RATE_LIMIT` | (Optional) Rate limit for vehicle registration |

**Client** – create as needed:

- `client/.env.development` – e.g. `VITE_API_BASE_URL=http://localhost:5000` (or leave empty to use Vite proxy)
- `client/.env.production` – e.g. `VITE_API_BASE_URL=https://your-api-domain.com`

Optional:

- `VITE_MIET_LOGO_URL` – Override logo URL on login/header.
- `VITE_PI360_LOGIN_URL` – If set, the “Sign in with PI-360” button can redirect to this URL (e.g. PI-360 SSO).

All client API calls use `client/src/services/api.js` (base URL, token attachment, 401 → logout/redirect).

### 3. MongoDB

Start MongoDB locally or use Atlas and set `MONGODB_URI` in `server/.env`.

### 4. Seed admin user (for dashboard)

```bash
cd server && npm run seed:admin
```

Default admin: `admin@mietjammu.in` / `ChangeMe123`. Change the password after first login.

---

## Run locally

**Run both backend and frontend:**

```bash
npm run dev
```

**Or in separate terminals:**

```bash
# Terminal 1 – backend
npm run server

# Terminal 2 – frontend
npm run client
```

- **Frontend:** http://localhost:5173  
- **Backend:** http://localhost:5000  

**Health check:** `curl http://localhost:5000/api/health` → `{"ok":true}`

### If vehicle submit fails (net::ERR, etc.)

1. Ensure both `npm run server` and `npm run client` are running (or use `npm run dev`).
2. In the browser console, check the request URL in the Vehicle API log.
3. In the backend terminal, confirm you see the vehicle register route being hit.
4. In dev, either leave `VITE_API_BASE_URL` unset (Vite proxy) or set it to `http://localhost:5000` (no trailing slash).

---

## API overview

### User (PI-360)

- **POST /api/auth/login**  
  Body: `{ "username_1": "email@example.com", "password_1": "password", "fcm_token": "" }`  
  Returns `{ token, user }` on success.  
  Status: 200 OK, 204 Invalid credentials, 202 Inactive, 5xx Server error.

- **POST /api/vehicle/register**  
  Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`  
  Body: `rc_number`, `owner_name` (required); optional: `student_name`, `email`, `mobile`, `account_type`, `department` (from PI-360 or body).  
  Returns `{ success, message, data }` – see [Vehicle registration flow (accept / reject)](#vehicle-registration-flow-accept--reject) for when it is accepted vs rejected and all error responses.

### Admin (separate auth; not PI-360)

- **POST /api/admin/login** – Body: `{ email, password }` → `{ status, token, admin }`
- **GET /api/admin/me** – Headers: `Authorization: Bearer <admin_token>`
- **GET /api/admin/vehicles** – Query: `?page=1&limit=10&search=...&vehicle_type=...`
- **GET /api/admin/vehicles/:id/rc** – Redirects to Cloudinary RC URL

---

## Vehicle registration flow (accept / reject)

The vehicle registration endpoint **POST /api/vehicle/register** validates the user (JWT), then validates input, checks for an existing approved registration with the same RC number, calls **Surepass** to verify the RC, and compares the **owner name** with Surepass data. The record is either **Approved** (saved with `status: 'Approved'`) or **Rejected** (saved with `status: 'Rejected'` and a `rejection_reason`).

### Flow summary

1. **Auth** – Request must include `Authorization: Bearer <PI-360 token>`. If missing or invalid → **401**; frontend redirects to login.
2. **Rate limit** – Default 10 requests per 10 minutes per IP. Exceeded → **429** with message below.
3. **Input validation** – `rc_number` (required, format `[A-Z0-9\- ]{6,20}`) and `owner_name` (required). Invalid → **400** with the first validation message.
4. **User identity** – User ID and email must be present (from JWT/body). Missing → **400**.
5. **Duplicate check** – If an **Approved** registration already exists for this RC number → **409**.
6. **Surepass verification** – Backend calls Surepass RC API with `rc_number`. On failure → record is saved as **Rejected** and **400/500** is returned with the error message.
7. **Owner name match** – Owner name from the form is normalized and compared with Surepass owner name. If they don’t match → record is saved as **Rejected** and **400** is returned.
8. **Success** – A new registration is saved with `status: 'Approved'` and **201** is returned with success payload.

### When the registration is **accepted**

- **HTTP status:** 201  
- **Response:** `{ success: true, message: 'Vehicle registered successfully', data: { id, rc_number, owner_name, vehicle_number, status } }`  
- **Frontend:** Shows success message (e.g. “Vehicle registered successfully.”) and clears RC number and owner name.

### When the registration is **rejected** or an error occurs

The backend returns a JSON body of the form `{ success: false, message: '<user-facing message>', data: {} }`. The frontend displays `data.message` (or a fallback) in the error area. Possible cases:

| HTTP | When | Message (example) |
|------|------|--------------------|
| **400** | Validation: RC number missing | `RC number is required` |
| **400** | Validation: RC number format invalid | `Invalid RC number format` |
| **400** | Validation: Owner name missing | `Owner name is required` |
| **400** | User identity missing (e.g. token/body) | `User identity missing. Please log in again.` |
| **400** | Owner name does not match Surepass | `Owner name does not match RC records` |
| **401** | No token or invalid/expired PI-360 token | `Unauthorized - Token required...` / `Token expired - Please login again` / `Unauthorized` |
| **409** | RC number already registered (Approved) or duplicate key | `RC number is already registered` |
| **429** | Rate limit exceeded (register endpoint) | `Too many attempts. Try again later.` |
| **500** | Surepass config missing (env not set) | `Surepass configuration missing` |
| **500** | Surepass bad request (e.g. empty RC) | `RC number is required for Surepass verification` |
| **500** | Surepass timeout / network / backend down | `Vehicle data provider is temporarily unavailable. Please try again later.` or `Surepass request timed out` / `Unable to reach Surepass service` |
| **500** | Surepass verification failed (e.g. RC not found, invalid token) | Message from Surepass (e.g. `RC not found`, `Invalid or expired Surepass API token`) or `Surepass verification failed` |
| **500** | Other server error (e.g. DB) | `Server Error` or the thrown error message |

**Rejected records in DB:** When the failure is due to Surepass (timeout, error, or owner name mismatch), the backend still creates a **Rejected** registration with `rejection_reason` set to the message returned to the user (e.g. “Owner name does not match RC records” or “Vehicle data provider is temporarily unavailable…”). This allows admins to see attempted registrations and reasons for rejection.

---

## Admin dashboard

- **Login:** `/admin/login` (email + password; separate from PI-360).
- **Dashboard:** `/admin/dashboard` (after admin login).
- Admin token is stored separately from the PI-360 user token; 401 from admin API redirects to admin login.

---

## Favicon & branding

- Favicon is set in `client/index.html` (default: `/favicon.svg`). You can point it to the MIET logo PNG if desired.
- Logo on the login and header can be overridden with `VITE_MIET_LOGO_URL` in the client env.

---

## Production build & deploy

**Build frontend:**

```bash
npm run build
```

**Run server in production:**

```bash
cd server && NODE_ENV=production npm start
```

- In production, the server can serve `client/dist` (single process).
- Set `CLIENT_URL` to the production frontend origin.
- Set `client/.env.production` with `VITE_API_BASE_URL` to the production API URL.

**Checklist:**

- [ ] Copy `.env.example` to `.env` (server and client as needed); never commit real `.env`.
- [ ] Set `NODE_ENV=production` for the server.
- [ ] Set `CLIENT_URL` and CORS/origins for your domain.
- [ ] Set `VITE_API_BASE_URL` in `client/.env.production`.
- [ ] Use strong `JWT_SECRET` and `ADMIN_JWT_SECRET`; change default admin password after first login.
- [ ] (Optional) Prefer HTTP-only cookies for tokens and restrict CORS to a single origin.

---

## Security

- JWT verification on protected routes (user and admin).
- File type and size checks (e.g. PDF, JPG, PNG; max 5MB).
- RC files stored on Cloudinary; not in the public filesystem.
- Input validation and sanitization; Mongoose for DB (no raw SQL).
- Helmet, rate limiting, compression; CORS driven by `CLIENT_URL`/env.

---

## License & copyright

© 2026 MIET Jammu. All rights reserved.
