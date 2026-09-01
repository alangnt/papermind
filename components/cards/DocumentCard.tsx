'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  BookmarkPlus,
  BookmarkCheck,
  ExternalLink,
  FileText,
  Maximize2,
  Share2,
  Trash2,
  FolderPlus,
} from 'lucide-react';
import Link from 'next/link';
import { Document } from '@/types/documents';
import { categoryBadgeClass } from '@/lib/categories';
import { parseArxivId } from '@/lib/arxiv-id';
import ShareCard from '@/components/cards/ShareCard';
import AddToGroup from '@/components/groups/AddToGroup';

type Props = {
  document: Document;
  username?: string;
  isSaved?: boolean;
  /** Supplied by the group page; absent everywhere else, which hides the control. */
  onRemove?: () => void;
  removeLabel?: string;
  /** Who put this paper in the group. Only the group page knows this. */
  addedBy?: string;
};

export default function DocumentCard({
  document,
  username,
  isSaved = false,
  onRemove,
  removeLabel = 'Remove',
  addedBy,
}: Props) {
  const { title, authors, published, summary, pdfLink, id, category, doi } = document;
  const publishedDate = published ? new Date(published).toLocaleDateString() : 'Unknown';

  // UI state
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isGroupPickerOpen, setIsGroupPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(isSaved);
  const isConnected = !!username;
  const abstract = summary?.trim() || 'No summary available.';
  const truncated = useMemo(
    () => abstract.slice(0, 320) + (abstract.length > 320 ? '…' : ''),
    [abstract]
  );

  const saveArticle = useCallback(async () => {
    if (!isConnected || !username) return; // guard
    if (isSaving) return;
    setIsSaving(true);
    const optimistic = !saved; // target state after action
    setSaved(optimistic);
    try {
      const endpoint = '/api/users/article';
      const res = await fetch(endpoint, {
        method: optimistic ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send cookies automatically
        body: JSON.stringify(
          optimistic ? { username, article: document } : { username, article_id: document.id }
        ),
      });
      if (!res.ok) console.error(`Failed ${optimistic ? 'save' : 'unsave'}: ${res.status}`);
    } catch (e) {
      // revert on failure
      console.error(e);
      setSaved(!optimistic);
    } finally {
      setIsSaving(false);
    }
  }, [document, isConnected, saved, username, isSaving]);

  const categoryStyle = useMemo(() => categoryBadgeClass(category), [category]);

  // Papermind can only host a paper it can address by arXiv ID; anything else
  // keeps the arXiv link as its only destination.
  const arxivId = useMemo(() => parseArxivId(id), [id]);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="group relative flex flex-col justify-between bg-foreground border border-gray-700 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-colors duration-200 text-white space-y-4"
      aria-label={`Research paper card: ${title}`}
    >
      <div className="flex flex-col gap-4">
        <header className="space-y-1">
          <h2 className="font-semibold leading-snug text-base md:text-lg" title={title}>
            {title}
          </h2>
          {(category || doi) && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {category && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] tracking-wide uppercase font-medium border border-white/10 ${categoryStyle}`}
                  title={category}
                >
                  {category}
                </span>
              )}
              {doi && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 border border-white/10 text-gray-300 truncate max-w-[160px]"
                  title={doi}
                >
                  DOI: {doi}
                </span>
              )}
            </div>
          )}
          <p className="text-[11px] text-gray-400" title={authors?.join(', ') || 'Unknown author'}>
            {authors?.length
              ? authors.slice(0, 4).join(', ') +
                (authors.length > 4 ? ` +${authors.length - 4}` : '')
              : 'Unknown author'}
          </p>
          <p className="text-[11px] text-gray-500">Published {publishedDate}</p>
        </header>

        {/* The full abstract lives on the article page, reachable via Details. */}
        <p className="text-sm text-gray-200 leading-relaxed line-clamp-3">{truncated}</p>
      </div>

      <div className="space-y-4 pt-2">
        <div className="flex flex-wrap gap-2">
          {arxivId && (
            <Link
              href={`/article/${arxivId}`}
              className="flex items-center px-3 py-1.5 text-[11px] font-medium rounded-md bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-sm transition-colors"
              aria-label="Open the full article page"
            >
              <span className="inline-flex items-center gap-1">
                <Maximize2 className="w-3.5 h-3.5" /> Details
              </span>
            </Link>
          )}
          {pdfLink && (
            <Link
              href={pdfLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-3 py-1.5 text-[11px] font-medium rounded-md bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-sm transition-colors"
              aria-label="View PDF"
            >
              <span className="inline-flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> PDF
              </span>
            </Link>
          )}
          {id && (
            <Link
              href={id}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-3 py-1.5 text-[11px] font-medium rounded-md bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-sm transition-colors"
              aria-label="View original"
            >
              <span className="inline-flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" /> arXiv
              </span>
            </Link>
          )}
          {/* Saving needs an account, so the control is absent rather than dead
              when signed out — the footer explains why. */}
          {isConnected && (
            <button
              type="button"
              disabled={isSaving}
              onClick={saveArticle}
              aria-pressed={saved}
              aria-label={saved ? 'Unsave article' : 'Save article'}
              className={`px-3 py-1.5 text-[11px] cursor-pointer font-medium rounded-md border backdrop-blur-sm inline-flex items-center gap-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 disabled:opacity-40 disabled:cursor-not-allowed ${
                saved
                  ? 'bg-background text-foreground hover:bg-background/80'
                  : 'bg-white/10 border-white/10 hover:bg-white/15'
              }`}
              title={saved ? 'Click to remove from saved' : 'Click to save'}
            >
              {saved ? (
                <BookmarkCheck className="w-3.5 h-3.5" />
              ) : (
                <BookmarkPlus className="w-3.5 h-3.5" />
              )}
              {isSaving ? '...' : saved ? 'Saved' : 'Save'}
            </button>
          )}
          {arxivId && (
            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              aria-label="Share this article"
              className="px-3 py-1.5 text-[11px] cursor-pointer font-medium rounded-md border border-white/10 bg-white/10 hover:bg-white/15 backdrop-blur-sm inline-flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          )}
          {/* Grouping needs an account, so the control is absent when signed out. */}
          {arxivId && isConnected && (
            <button
              type="button"
              onClick={() => setIsGroupPickerOpen(true)}
              aria-label="Add this article to a group"
              className="px-3 py-1.5 text-[11px] cursor-pointer font-medium rounded-md border border-white/10 bg-white/10 hover:bg-white/15 backdrop-blur-sm inline-flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            >
              <FolderPlus className="w-3.5 h-3.5" /> Group
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={removeLabel}
              className="px-3 py-1.5 text-[11px] cursor-pointer font-medium rounded-md border border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/20 backdrop-blur-sm inline-flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400/40"
            >
              <Trash2 className="w-3.5 h-3.5" /> {removeLabel}
            </button>
          )}
        </div>
        <footer className="text-[10px] text-gray-500 pt-2 border-t border-gray-700 mt-2 flex items-center justify-between">
          <span>
            Source{' '}
            <Link
              href="https://arxiv.org"
              target="_blank"
              className="underline hover:text-gray-300"
              aria-label="arXiv.org"
            >
              arXiv
            </Link>
          </span>
          {!isConnected && <span className="text-[9px] text-gray-600 italic">Sign in to save</span>}
          {/* In a group the useful name is whoever added the paper, not whoever
              happens to be reading it. An empty string means they have since
              deleted their account; undefined means we are not in a group. */}
          {addedBy !== undefined ? (
            <span className="text-gray-600/70">
              {addedBy === '' ? (
                'Added by a former member'
              ) : (
                <>
                  Added by @{addedBy}
                  {addedBy === username && ' (you)'}
                </>
              )}
            </span>
          ) : (
            isConnected && <span className="text-gray-600/70">@{username}</span>
          )}
        </footer>
      </div>

      {isShareOpen && arxivId && (
        <ShareCard arxivId={arxivId} title={title} onClose={() => setIsShareOpen(false)} />
      )}

      {isGroupPickerOpen && arxivId && (
        <AddToGroup
          arxivId={arxivId}
          title={title}
          username={username ?? ''}
          onClose={() => setIsGroupPickerOpen(false)}
        />
      )}
    </motion.article>
  );
}
