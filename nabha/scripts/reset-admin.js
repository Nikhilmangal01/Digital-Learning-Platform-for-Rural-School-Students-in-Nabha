// Super Admin Recovery & Reset Tool
// Digital Learning Platform - Nabha | Developed by Piyush and Team (PS019)
// Usage: node scripts/reset-admin.js [optional_username] [optional_new_password]

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');

const H = p => crypto.scryptSync(p, 'nabha-salt', 32).toString('hex');

async function recoverSuperAdmin() {
  const args = process.argv.slice(2);
  const targetUsername = (args[0] || 'admin').trim().toLowerCase();
  const targetPassword = args[1] || 'admin123';
  const newHash = H(targetPassword);

  console.log('\n=============================================================');
  console.log('   🛡️  NABHA PLATFORM - SUPER ADMIN RECOVERY UTILITY        ');
  console.log('=============================================================\n');
  console.log(`[1/3] Target Username: "${targetUsername}"`);
  console.log(`[2/3] Setting Password: "${targetPassword}"`);

  // 1. Update local JSON storage (both root and backend)
  const jsonFiles = [
    path.resolve(__dirname, '..', 'data.json'),
    path.resolve(__dirname, '..', 'backend', 'data.json'),
  ];

  let localUpdated = false;
  for (const f of jsonFiles) {
    if (fs.existsSync(f)) {
      try {
        const raw = fs.readFileSync(f, 'utf8');
        const data = JSON.parse(raw);
        data.users = data.users || [];

        let adminUser = data.users.find(u => u.role === 'admin' || u.username === targetUsername);
        if (adminUser) {
          adminUser.username = targetUsername;
          adminUser.hash = newHash;
          adminUser.role = 'admin';
          adminUser.approved = true;
        } else {
          adminUser = {
            id: 1,
            username: targetUsername,
            name: 'Harpreet Singh',
            role: 'admin',
            class: 0,
            hash: newHash,
            approved: true,
          };
          data.users.push(adminUser);
        }

        fs.writeFileSync(f, JSON.stringify(data, null, 2));
        localUpdated = true;
        console.log(`[Local Store] Successfully updated admin in ${path.basename(path.dirname(f))}/${path.basename(f)}`);
      } catch (err) {
        console.error(`[Local Store Error] ${f}:`, err.message);
      }
    }
  }

  // 2. Update MongoDB Atlas if connected
  try {
    const mongoDb = db.getDB ? db.getDB() : null;
    if (mongoDb) {
      const usersCol = mongoDb.collection('users');
      const existing = await usersCol.findOne({
        $or: [{ role: 'admin' }, { username: targetUsername }],
      });

      if (existing) {
        await usersCol.updateOne(
          { _id: existing._id },
          { $set: { username: targetUsername, hash: newHash, role: 'admin', approved: true } }
        );
        console.log('[MongoDB Atlas] Successfully updated Super Admin credentials.');
      } else {
        await usersCol.insertOne({
          id: 1,
          username: targetUsername,
          name: 'Harpreet Singh',
          role: 'admin',
          class: 0,
          hash: newHash,
          approved: true,
        });
        console.log('[MongoDB Atlas] Successfully created new Super Admin account.');
      }
    } else {
      console.log('[MongoDB Atlas] Database not active or running in offline mode. Local store updated.');
    }
  } catch (err) {
    console.warn('[MongoDB Atlas Notice]:', err.message);
  }

  console.log('\n=============================================================');
  console.log('✅ RECOVERY COMPLETE! SUPER ADMIN ACCESS RESTORED:');
  console.log('-------------------------------------------------------------');
  console.log(` • Username  : ${targetUsername}`);
  console.log(` • Password  : ${targetPassword}`);
  console.log(` • Role      : Super Administrator`);
  console.log(` • Login URL : http://localhost:3000/admin/login.html`);
  console.log('=============================================================\n');
  process.exit(0);
}

recoverSuperAdmin().catch(err => {
  console.error('[Recovery Error]:', err);
  process.exit(1);
});
