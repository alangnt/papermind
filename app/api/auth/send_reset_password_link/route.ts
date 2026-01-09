import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ResetPasswordToken } from '@/types/models';
import crypto from 'crypto';

const postmark = require('postmark');

const POSTMARK_TOKEN = process.env.POSTMARK_SERVER_TOKEN;
const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    if (!POSTMARK_TOKEN) {
      return NextResponse.json(
        { error: 'POSTMARK_SERVER_TOKEN not configured' },
        { status: 500 }
      );
    }

    const body: ResetPasswordToken = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const usersCollection = await getCollection('users');
    const userExists = await usersCollection.findOne({ email });

    if (!userExists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('base64url');
    const resetPasswordTokenUrl = `${WEBSITE_URL}/reset_password/${resetToken}`;
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 1); // 1 hour expiry

    // Store reset token
    const resetTokensCollection = await getCollection('reset_tokens');
    const existingToken = await resetTokensCollection.findOne({ email });

    if (existingToken) {
      await resetTokensCollection.updateOne(
        { email },
        { $set: { token: resetToken, expiration_date: expirationDate } }
      );
    } else {
      await resetTokensCollection.insertOne({
        token: resetToken,
        email,
        expiration_date: expirationDate,
      });
    }

    // Send email via Postmark
    const client = new postmark.ServerClient(POSTMARK_TOKEN);
    
    const emailResult = await client.sendEmail({
      From: 'info@papermind.ch',
      To: email,
      Subject: 'Reset your password',
      HtmlBody: `Hi!<br />Here's the URL to reset your password: <a href='${resetPasswordTokenUrl}'>${resetPasswordTokenUrl}</a>`,
      MessageStream: 'outbound',
    });

    return NextResponse.json({
      status: 200,
      message: 'Reset email sent',
      postmark: emailResult,
    });
  } catch (error) {
    console.error('Send reset password link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
