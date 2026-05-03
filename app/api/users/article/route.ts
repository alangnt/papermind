import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';                                                               
import { headers } from 'next/headers';
import { User } from '@/types/models';
import { getCollection } from '@/lib/mongodb';
import { Document } from '@/types/models';

export const POST = async (req: NextRequest) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as unknown as User;

  try {
    const body = await req.json();
    const { article } = body;

    if (!article) {
      return NextResponse.json(
        { error: 'Article is required' },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection('users');
    const dbUser = await usersCollection.findOne({ username: user.username });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const savedArticles: Document[] = dbUser.saved_articles || [];
    const articleExists = savedArticles.some((a) => a.id === article.id);

    if (!articleExists) {
      savedArticles.push(article);
    }

    const result = await usersCollection.updateOne(
      { username: user.username },
      { $set: { saved_articles: savedArticles } }
    );

    if (result.modifiedCount === 0 && !articleExists) {
      return NextResponse.json(
        { error: 'Failed to save article' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Article saved',
      status: 200,
      data: article,
    });
  } catch (error) {
    console.error('Save article error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

export const DELETE = async (req: NextRequest) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as unknown as User;
  
  try {
    const body = await req.json();
    const { article_id } = body;

    if (!article_id) {
      return NextResponse.json(
        { error: 'Article id is required' },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection('users');
    const dbUser = await usersCollection.findOne({ username: user.username });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const savedArticles: Document[] = dbUser.saved_articles || [];
    const remaining = savedArticles.filter((a) => a.id !== article_id);

    if (remaining.length === savedArticles.length) {
      return NextResponse.json(
        { error: 'Article not found in saved list' },
        { status: 404 }
      );
    }

    const result = await usersCollection.updateOne(
      { username: user.username },
      { $set: { saved_articles: remaining } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to delete article' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Article deleted',
      status: 200,
      data: { deleted_id: article_id },
    });
  } catch (error) {
    console.error('Delete saved article error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
