'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookmarkCheck, BookmarkPlus, FolderPlus, Share2 } from 'lucide-react';

import ShareCard from '@/components/cards/ShareCard';
import AddToGroup from '@/components/groups/AddToGroup';
import { apiFetch } from '@/lib/api';
import { Document } from '@/types/models';
import { BaseUser } from '@/types/users';

type Props = {
  document: Document;
  arxivId: string;
};

const BUTTON_CLASS =
  'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-white/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

/**
 * Save and Share for the article page.
 *
 * The page itself is a Server Component with no session, so the signed-in user
 * is resolved here the same way the search page does it.
 */
export default function ArticleActions({ document: article, arxivId }: Props) {
  const [username, setUsername] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isGroupPickerOpen, setIsGroupPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      try {
        const res = await apiFetch('/api/users/me', { method: 'GET' });
        if (!res.ok || cancelled) return;

        const user = (await res.json()) as BaseUser;
        if (cancelled) return;

        setUsername(user.username);
        setSaved(!!user.saved_articles?.some((saved) => saved.id === article.id));
      } catch (error) {
        // Signed out is the common case here, so this is not worth surfacing.
        console.error(error);
      }
    };

    void loadUser();
    return () => {
      cancelled = true;
    };
  }, [article.id]);

  const toggleSave = useCallback(async () => {
    if (!username || isSaving) return;

    const target = !saved;
    setIsSaving(true);
    setSaved(target);

    try {
      const res = await apiFetch('/api/users/article', {
        method: target ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target ? { username, article } : { username, article_id: article.id }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
    } catch (error) {
      console.error(error);
      setSaved(!target);
    } finally {
      setIsSaving(false);
    }
  }, [article, isSaving, saved, username]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsShareOpen(true)}
        className={`${BUTTON_CLASS} bg-white text-black border-transparent hover:bg-gray-200`}
      >
        <Share2 className="w-3.5 h-3.5" /> Share
      </button>

      <button
        type="button"
        onClick={toggleSave}
        disabled={!username || isSaving}
        aria-pressed={saved}
        title={username ? undefined : 'Sign in to save this article'}
        className={`${BUTTON_CLASS} ${saved ? 'bg-background text-foreground hover:bg-background/80' : 'bg-white/10 hover:bg-white/15'}`}
      >
        {saved ? (
          <BookmarkCheck className="w-3.5 h-3.5" />
        ) : (
          <BookmarkPlus className="w-3.5 h-3.5" />
        )}
        {isSaving ? '…' : saved ? 'Saved' : 'Save'}
      </button>

      {username && (
        <button
          type="button"
          onClick={() => setIsGroupPickerOpen(true)}
          className={`${BUTTON_CLASS} bg-white/10 hover:bg-white/15`}
        >
          <FolderPlus className="w-3.5 h-3.5" /> Add to group
        </button>
      )}

      {isGroupPickerOpen && (
        <AddToGroup
          arxivId={arxivId}
          title={article.title}
          onClose={() => setIsGroupPickerOpen(false)}
        />
      )}

      {isShareOpen && (
        <ShareCard arxivId={arxivId} title={article.title} onClose={() => setIsShareOpen(false)} />
      )}
    </>
  );
}
