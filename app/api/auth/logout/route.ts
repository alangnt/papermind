import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });

    // Clear cookies using Next.js cookies API
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
