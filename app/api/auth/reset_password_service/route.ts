import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { validatePasswordStrength } from '@/lib/password';
import bcrypt from 'bcryptjs';

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, email, password, confirm_password } = body;

    if (!token || !email || !password || !confirm_password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (typeof token !== 'string' || typeof email !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    if (password !== confirm_password) {
      return NextResponse.json(
        { error: "Passwords don't match" },
        { status: 400 }
      );
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Password does not meet requirements',
          details: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    // Validate the reset token before changing the password
    const resetTokensCollection = await getCollection('reset_tokens');
    const resetToken = await resetTokensCollection.findOne({ token, email });

    if (!resetToken || new Date(resetToken.expiration_date) < new Date()) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    // Hash and update the new password
    const hashedPassword = await hashPassword(password);
    const usersCollection = await getCollection('users');
    const result = await usersCollection.updateOne(
      { email },
      { $set: { password: hashedPassword } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Consume the token
    await resetTokensCollection.deleteOne({ token });

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
