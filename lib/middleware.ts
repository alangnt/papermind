import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './auth';
import { getCollection } from './mongodb';
import { User } from '@/types/models';

export interface AuthenticatedRequest extends NextRequest {
  user?: User;
}

/**
 * Higher-order function to protect API routes with authentication
 * Extracts JWT from Authorization header and verifies it
 */
export function withAuth<T = any>(
  handler: (req: NextRequest, context: { user: User; params?: T }) => Promise<Response>
) {
  return async (req: NextRequest, context?: { params: T }): Promise<Response> => {
    try {
      const authHeader = req.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Missing or invalid authorization header' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
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
