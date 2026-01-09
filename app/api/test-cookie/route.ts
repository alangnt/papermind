import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const response = NextResponse.json({
    message: 'Test cookie endpoint',
    timestamp: new Date().toISOString(),
  });

  // Test setting a simple cookie
  response.cookies.set('test_cookie', 'test_value', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60,
    path: '/',
  });

  return response;
}
