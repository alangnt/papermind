import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './auth';
import { getCollection } from './mongodb';
import { User } from '@/types/models';
import { getCookie } from './cookies';

export interface AuthenticatedRequest extends NextRequest {
  user?: User;
}

/**
 * Higher-order function to protect API routes with authentication
 * Extracts JWT from cookies (primary) or Authorization header (fallback)
 */
export function withAuth<T = any>(
  handler: (req: NextRequest, context: { user: User; params?: T }) => Promise<Response>
) {
  return async (req: NextRequest, context?: { params: T }): Promise<Response> => {
    try {
      const cookieHeader = req.headers.get('cookie');
      const authHeader = req.headers.get('authorization');
      
      // Try to get token from cookies first (primary)
      let token = getCookie(cookieHeader, 'access_token');
      
      // Fallback to Authorization header for API compatibility
      if (!token && authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      }

      if (!token) {
        return NextResponse.json(
          { error: 'Missing or invalid authorization' },
          { status: 401 }
        );
      }
      
      let payload;
      try {
        payload = verifyAccessToken(token);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      const username = payload.sub;
      if (!username) {
        return NextResponse.json(
          { error: 'Invalid token payload' },
          { status: 401 }
        );
      }

      // Fetch user from database
      const usersCollection = await getCollection<User>('users');
      const user = await usersCollection.findOne({ username });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        );
      }

      if (user.disabled) {
        return NextResponse.json(
          { error: 'User account is disabled' },
          { status: 400 }
        );
      }

      // Call the actual handler with the authenticated user
      return handler(req, { user, params: context?.params as T });
    } catch (error) {
      console.error('Authentication error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
