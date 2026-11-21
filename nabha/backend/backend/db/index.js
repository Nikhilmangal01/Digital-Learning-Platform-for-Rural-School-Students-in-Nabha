// Digital Learning Platform - Nabha | Database Index Entry
const { connectDB, getDB, closeDB } = require('./connection');
const { seedDatabase, H, T } = require('./seed');
const operations = require('./operations');

async function initDB() {
  const db = await connectDB();
  await seedDatabase(db);
  return db;
}

module.exports = {
  connectDB,
  getDB,
  closeDB,
  initDB,
  seedDatabase,
  H,
  T,
  ...operations,
};
