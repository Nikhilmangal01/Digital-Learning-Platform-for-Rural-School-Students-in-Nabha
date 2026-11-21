// Digital Learning Platform - Nabha | Database Connection (MongoDB Atlas)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');

const dbName = process.env.DB_NAME || 'nabha';
let client = null;
let dbInstance = null;

function isAtlasConfigured() {
  const uri = process.env.MONGODB_URI;
  return Boolean(uri && !uri.includes('<username>') && !uri.includes('<password>'));
}

async function connectDB() {
  if (dbInstance) return dbInstance;

  const uri = process.env.MONGODB_URI;
  if (!isAtlasConfigured()) {
    console.warn('\n===============================================================');
    console.warn('[MongoDB Atlas Notice]');
    console.warn('MONGODB_URI in .env contains placeholders or is not set.');
    console.warn('To persist data in MongoDB Atlas:');
    console.warn('1. Open .env in your project folder: D:\\Final Year Project\\Nabha project\\nabha\\.env');
    console.warn('2. Paste your MongoDB Atlas connection string into MONGODB_URI.');
    console.warn('===============================================================\n');
    return null;
  }

  try {
    console.log('[MongoDB] Connecting to MongoDB Atlas...');
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
    });

    await client.connect();
    dbInstance = client.db(dbName);
    console.log(`[MongoDB] Connected successfully to MongoDB Atlas database: "${dbName}"`);
    return dbInstance;
  } catch (err) {
    console.error('[MongoDB] Connection failed:', err.message);
    throw err;
  }
}

function getDB() {
  return dbInstance;
}

async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    dbInstance = null;
    console.log('[MongoDB] Connection closed.');
  }
}

module.exports = {
  connectDB,
  getDB,
  closeDB,
  isAtlasConfigured,
};
