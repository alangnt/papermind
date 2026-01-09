// Database migration script for existing users
// Run this to add security fields to existing users

import { getCollection } from './lib/mongodb';

async function migrateUsers() {
  try {
    console.log('Starting user migration...');
    
    const usersCollection = await getCollection('users');
    
    // Update all users that don't have the new security fields
    const result = await usersCollection.updateMany(
      {
        $or: [
          { tokenVersion: { $exists: false } },
          { failedLoginAttempts: { $exists: false } },
          { lockedUntil: { $exists: false } },
          { emailVerified: { $exists: false } }
        ]
      },
      {
        $set: {
          tokenVersion: 0,
          failedLoginAttempts: 0,
          lockedUntil: null,
          emailVerified: true // Grandfather existing users
        }
      }
    );

    console.log(`✅ Migration complete!`);
    console.log(`   Matched: ${result.matchedCount} users`);
    console.log(`   Modified: ${result.modifiedCount} users`);
    
    // Verify migration
    const usersWithoutFields = await usersCollection.countDocuments({
      $or: [
        { tokenVersion: { $exists: false } },
        { failedLoginAttempts: { $exists: false } },
        { lockedUntil: { $exists: false } },
        { emailVerified: { $exists: false } }
      ]
    });
    
    if (usersWithoutFields === 0) {
      console.log('✅ All users have been migrated successfully!');
    } else {
      console.log(`⚠️  Warning: ${usersWithoutFields} users still missing fields`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateUsers();
