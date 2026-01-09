import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Check if token exists and is valid
    const resetTokensCollection = await getCollection('reset_tokens');
    const resetToken = await resetTokensCollection.findOne({ token });

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Link expired' },
        { status: 404 }
      );
    }

    // Check if token has expired
    const expirationDate = new Date(resetToken.expiration_date);
    const now = new Date();

    if (expirationDate < now) {
      return NextResponse.json(
        { error: 'Link expired' },
        { status: 404 }
      );
    }

    // Return the associated email
    return NextResponse.json({
      content: resetToken.email,
    });
  } catch (error) {
    console.error('Check reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
