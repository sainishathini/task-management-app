const mongoose = require('mongoose');

const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taskman';
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
};

module.exports = connectDB;
