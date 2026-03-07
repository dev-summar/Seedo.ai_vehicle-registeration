const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const fetch = require('node-fetch');
const { set: setRole } = require('../config/roleCache');

// In production these are validated at startup; fallbacks for dev only
const PI360_API_URL = process.env.PI360_API_URL?.trim() || (process.env.NODE_ENV === 'production' ? '' : 'https://pi360.net/site/api/api_login_user_web.php');
const INSTITUTE_ID = process.env.PI360_INSTITUTE_ID?.trim() || (process.env.NODE_ENV === 'production' ? '' : 'mietjammu');

router.post('/login', async (req, res) => {
  try {
    if (!PI360_API_URL || !INSTITUTE_ID) {
      return res.status(503).json({ message: 'Server misconfiguration' });
    }
    const { username_1, password_1, fcm_token = '' } = req.body;

    if (!username_1 || !password_1) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const url = `${PI360_API_URL}?institute_id=${INSTITUTE_ID}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username_1: String(username_1).trim(),
        password_1: String(password_1),
        fcm_token: fcm_token || '',
      }),
    });

    const data = await response.json().catch(() => ({}));
    const statusCode = response.status;

    if (statusCode === 200) {
      const token = data.token || data.jwt || data.access_token || data.data?.token;
      if (!token) {
        return res.status(500).json({ message: 'Login succeeded but no token received' });
      }
      // Cache accountType for admin routes (fallback when JWT lacks it)
      try {
        const decoded = jwt.decode(token);
        const keys = [
          decoded?.sub,
          decoded?.id,
          decoded?.userId,
          decoded?.user_id,
          data.data?.email,
          data.data?.id,
        ].filter(Boolean);
        const accountType = data.data?.accountType || data.data?.account_type || data.user?.accountType;
        if (keys.length && accountType) setRole(keys, accountType);
      } catch (e) { /* ignore */ }
      return res.status(200).json({
        message: 'Login successful',
        token,
        user: data.user || data.data || data,
      });
    }

    if (statusCode === 204) {
      return res.status(204).json({ message: 'Invalid Username or Password' });
    }
    if (statusCode === 202) {
      return res.status(202).json({ message: 'Account Inactive' });
    }
    if (statusCode >= 500) {
      return res.status(500).json({ message: 'Server Error' });
    }

    const msg = data.message || data.msg || 'Login failed';
    return res.status(statusCode).json({ message: msg });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.error('Login error:', err.message || err);
    return res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
