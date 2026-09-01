import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getCollection } from '@/lib/mongodb';
import { User } from '@/types/models';

/**
 * Saved articles live in an array inside the user document, so they need a
 * ceiling: MongoDB caps a document at 16MB and an arXiv record is not small.
 */
const MAX_SAVED_ARTICLES = 500;

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json().catch(() => null);
    const { article } = body ?? {};

    if (!article || typeof article.id !== 'string') {
      return NextResponse.json({ error: 'Article is required' }, { status: 400 });
    }

    const usersCollection = await getCollection<User>('users');

    // Membership, the duplicate check and the cap all sit in the filter, so this
    // is one atomic update. Reading the array and writing it back whole — as
    // this route used to — silently dropped a concurrent save from another tab.
    const result = await usersCollection.updateOne(
      {
        username: user.username,
        'saved_articles.id': { $ne: article.id },
        [`saved_articles.${MAX_SAVED_ARTICLES - 1}`]: { $exists: false },
      },
      { $push: { saved_articles: article } }
    );

    if (result.matchedCount > 0) {
      return NextResponse.json({ message: 'Article saved', data: article });
    }

    // Nothing matched: work out which of the conditions failed.
    const dbUser = await usersCollection.findOne(
      { username: user.username },
      { projection: { saved_articles: 1 } }
    );

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const saved = dbUser.saved_articles ?? [];
    if (saved.some((candidate) => candidate.id === article.id)) {
      // Saving something already saved is the caller getting what they wanted.
      return NextResponse.json({ message: 'Article already saved', data: article });
    }

    return NextResponse.json(
      { error: `You can save at most ${MAX_SAVED_ARTICLES} articles` },
      { status: 409 }
    );
  } catch (error) {
    console.error('Save article error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json().catch(() => null);
    const { article_id } = body ?? {};

    if (typeof article_id !== 'string' || !article_id) {
      return NextResponse.json({ error: 'Article id is required' }, { status: 400 });
    }

    const usersCollection = await getCollection<User>('users');

    // The id is in the filter, not just the $pull, so matchedCount tells us
    // whether the article was actually there.
    const result = await usersCollection.updateOne(
      { username: user.username, 'saved_articles.id': article_id },
      { $pull: { saved_articles: { id: article_id } } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Article not found in saved list' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Article deleted', data: { deleted_id: article_id } });
  } catch (error) {
    console.error('Delete saved article error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
