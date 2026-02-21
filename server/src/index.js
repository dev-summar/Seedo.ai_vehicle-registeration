const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicle');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

connectDB();

// Security: Helmet
app.use(helmet({ contentSecurityPolicy: isProduction }));

// Compression
app.use(compression());

// Logging (dev only)
if (!isProduction) {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : 200,
  message: { message: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS: origins from env only (CLIENT_URL and/or comma-separated CORS_ORIGINS)
const clientUrl = process.env.CLIENT_URL || '';
const corsOriginsEnv = process.env.CORS_ORIGINS || '';
const allowedOrigins = [
  ...(clientUrl ? [clientUrl] : []),
  ...corsOriginsEnv.split(',').map((s) => s.trim()).filter(Boolean),
].filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = allowedOrigins.some((o) => o === origin);
    cb(null, allowed ? origin : (allowedOrigins[0] || true));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.get('/api/health', (req, res) => res.status(200).json({ ok: true, message: 'Server running' }));
app.use('/api/auth', authRoutes);
app.use('/api/vehicle', vehicleRoutes);
app.use('/api/admin', adminRoutes);

// Unmatched API routes → 404 JSON; then production static
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ message: 'Not found' });
  next();
});

if (isProduction) {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Server Error';
  if (!isProduction) console.error(err.stack);
  res.status(status).json({ message });
});

app.listen(PORT, () => {
  if (!isProduction) console.log(`Server running on port ${PORT}`);
});
