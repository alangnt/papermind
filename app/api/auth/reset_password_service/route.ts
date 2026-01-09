import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';
import { ResetPassword } from '@/types/models';

export async function POST(req: NextRequest) {
  try {
    const body: ResetPassword = await req.json();
    const { email, password, confirm_password } = body;

    if (!password || !confirm_password) {
      return NextResponse.json(
        { error: 'Both passwords are required' },
        { status: 400 }
      );
    }

    if (password !== confirm_password) {
      return NextResponse.json(
        { error: "Passwords don't match" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update user password
    const usersCollection = await getCollection('users');
    const result = await usersCollection.updateOne(
      { email },
      { $set: { password: hashedPassword } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 400 }
      );
    }

    // Delete the reset token
    const resetTokensCollection = await getCollection('reset_tokens');
    const deleteResult = await resetTokensCollection.deleteOne({ email });

    if (deleteResult.deletedCount === 0) {
      console.warn('Reset token not found for email:', email);
      // Don't fail the request if token deletion fails
    }

    return NextResponse.json({
      status: 200,
      message: 'Password has been reset',
    });
  } catch (error) {
    console.error('Reset password service error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
