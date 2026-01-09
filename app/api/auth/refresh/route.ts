import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, createAccessToken } from '@/lib/auth';
import { RefreshRequest, Token } from '@/types/models';

export async function POST(req: NextRequest) {
  try {
    const body: RefreshRequest = await req.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Verify refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refresh_token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    const username = payload.sub;
    if (!username) {
      return NextResponse.json(
        { error: 'Invalid refresh token payload' },
        { status: 401 }
      );
    }

    // Create new access token
    const access_token = createAccessToken({ sub: username });

    const response: Token = {
      access_token,
      token_type: 'bearer',
      refresh_token, // Return the same refresh token (stateless)
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
