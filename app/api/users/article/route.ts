import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { SaveArticle, DeleteSavedArticle, Document } from '@/types/models';

export async function POST(req: NextRequest) {
  try {
    const body: SaveArticle = await req.json();
    const { username, article } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    if (!article) {
      return NextResponse.json(
        { error: 'Article is required' },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ username });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get existing saved articles
    const savedArticles: Document[] = user.saved_articles || [];
    
    // Check if article is already saved
    const articleExists = savedArticles.some((a) => a.id === article.id);
    
    if (!articleExists) {
      savedArticles.push(article);
    }

    // Update user with new saved articles
    const result = await usersCollection.updateOne(
      { username },
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
}

export async function DELETE(req: NextRequest) {
  try {
    const body: DeleteSavedArticle = await req.json();
    const { username, article_id } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    if (!article_id) {
      return NextResponse.json(
        { error: 'Article id is required' },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ username });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get existing saved articles and filter out the one to delete
    const savedArticles: Document[] = user.saved_articles || [];
    const remaining = savedArticles.filter((a) => a.id !== article_id);

    if (remaining.length === savedArticles.length) {
      return NextResponse.json(
        { error: 'Article not found in saved list' },
        { status: 404 }
      );
    }

    // Update user with filtered articles
    const result = await usersCollection.updateOne(
      { username },
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
}
