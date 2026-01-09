import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getCollection } from '@/lib/mongodb';
import { verifyPassword, hashPassword } from '@/lib/auth';
import { EditPassword, UserInDB } from '@/types/models';

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body: EditPassword = await req.json();
    const { old_password, new_password, confirm_new_password } = body;

    if (!old_password || !new_password || !confirm_new_password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (new_password !== confirm_new_password) {
      return NextResponse.json(
        { error: 'The new passwords do not match' },
        { status: 409 }
      );
    }

    // Get user with password from database
    const usersCollection = await getCollection<UserInDB>('users');
    const userWithPassword = await usersCollection.findOne({ email: user.email });

    if (!userWithPassword) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify old password
    const isOldPasswordValid = await verifyPassword(old_password, userWithPassword.password);
    if (!isOldPasswordValid) {
      return NextResponse.json(
        { error: 'Old password is invalid' },
        { status: 400 }
      );
    }

    // Hash and update new password
    const hashedPassword = await hashPassword(new_password);
    const result = await usersCollection.updateOne(
      { email: user.email },
      { $set: { password: hashedPassword } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Changing password failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Changed password',
      status: 200,
    });
  } catch (error) {
    console.error('Edit password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
