const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.PI360_JWT_SECRET || 'fallback-secret-change-me';
// When true: if verify fails (e.g. invalid signature), decode token without verify and trust it.
// Use when PI-360 does not share their JWT signing secret. Less secure but allows form submit to work.
const TRUST_PI360_WITHOUT_VERIFY = process.env.TRUST_PI360_TOKEN_WITHOUT_VERIFY === 'true';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    console.error('[Auth] Token missing - rejecting with 401');
    return res.status(401).json({ message: 'Unauthorized - Token required. Please log in again.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired - Please login again' });
    }
    if (err.name === 'JsonWebTokenError' && TRUST_PI360_WITHOUT_VERIFY) {
      const decoded = jwt.decode(token);
      if (decoded && typeof decoded === 'object') {
        req.user = decoded;
        console.log('[Auth] Using PI-360 token without verify (TRUST_PI360_TOKEN_WITHOUT_VERIFY=true)');
        return next();
      }
    }
    if (err.name === 'JsonWebTokenError') {
      const isSignature = err.message && err.message.toLowerCase().includes('signature');
      const message = isSignature
        ? 'Invalid token (signature). Set JWT_SECRET to match PI-360, or set TRUST_PI360_TOKEN_WITHOUT_VERIFY=true in .env'
        : 'Invalid token - Please login again';
      return res.status(401).json({ message });
    }
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

module.exports = { authMiddleware };
