import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, createAccessToken, createRefreshToken } from '@/lib/auth';
import { getCookie } from '@/lib/cookies';
import { createAuthCookies } from '@/lib/cookies';

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie');
    
    // Get refresh token from cookies (primary method)
    let refresh_token = getCookie(cookieHeader, 'refresh_token');
    
    // Fallback to request body for backward compatibility
    if (!refresh_token) {
      try {
        const body = await req.json();
        refresh_token = body.refresh_token;
      } catch (error) {
        // No JSON body, that's okay if we have cookie
      }
    }

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

    // Create new access token and refresh token
    const access_token = createAccessToken({ sub: username });
    const new_refresh_token = createRefreshToken({ sub: username });

    // Create secure cookies
    const [accessCookie, refreshCookie] = createAuthCookies(access_token, new_refresh_token);

    // Return success
    const response = NextResponse.json(
      { message: 'Token refreshed successfully' },
      { status: 200 }
    );

    // Set cookies in response
    response.headers.append('Set-Cookie', accessCookie);
    response.headers.append('Set-Cookie', refreshCookie);

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
