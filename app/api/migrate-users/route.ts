import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
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

    // Verify migration
    const usersWithoutFields = await usersCollection.countDocuments({
      $or: [
        { tokenVersion: { $exists: false } },
        { failedLoginAttempts: { $exists: false } },
        { lockedUntil: { $exists: false } },
        { emailVerified: { $exists: false } }
      ]
    });
    
    return NextResponse.json({
      success: true,
      message: 'Migration complete!',
      matched: result.matchedCount,
      modified: result.modifiedCount,
      remaining: usersWithoutFields,
    });
  } catch (error: any) {
    console.error('Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
