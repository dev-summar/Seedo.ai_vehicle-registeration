const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

exports.connectDB = async () => {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is required. Set it in .env');
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};
