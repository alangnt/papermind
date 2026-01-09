import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/cookies';

export async function POST(req: NextRequest) {
  try {
    // Clear authentication cookies
    const [clearAccess, clearRefresh] = clearAuthCookies();

    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );

    // Clear cookies in response
    response.headers.append('Set-Cookie', clearAccess);
    response.headers.append('Set-Cookie', clearRefresh);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
