/**
 * Seed first admin user.
 * Run: node scripts/seedAdmin.js (from server directory) or node server/scripts/seedAdmin.js (from root)
 *
 * Default credentials:
 *   Email: admin@mietjammu.in
 *   Password: ChangeMe123
 *
 * Change password after first login.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../src/models/Admin');

const SEED_EMAIL = 'admin@mietjammu.in';
const SEED_PASSWORD = 'ChangeMe123';
const SEED_NAME = 'Super Admin';
const SEED_ROLE = 'super_admin';

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required. Set it in .env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const existing = await Admin.findOne({ email: SEED_EMAIL });
  if (existing) {
    console.log('Admin already exists:', SEED_EMAIL);
    process.exit(0);
    return;
  }

  const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);
  await Admin.create({
    name: SEED_NAME,
    email: SEED_EMAIL,
    password: hashedPassword,
    role: SEED_ROLE,
  });

  console.log('Admin created successfully.');
  console.log('  Email:', SEED_EMAIL);
  console.log('  Password:', SEED_PASSWORD);
  console.log('  Change password after first login.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
