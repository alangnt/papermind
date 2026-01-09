"use client";

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookmarkPlus, BookmarkCheck, ExternalLink, FileText, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Document } from '@/types/documents';

type Props = {
  document: Document;
  username?: string;
  isSaved?: boolean;
};

export default function DocumentCard({ document, username, isSaved = false }: Props) {
  const { title, authors, published, summary, pdfLink, id, category, doi } = document;
  const publishedDate = published ? new Date(published).toLocaleDateString() : 'Unknown';

  // UI state
  const [expanded, setExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(isSaved);
  const isConnected = !!username;
  const abstract = summary?.trim() || 'No summary available.';
  const truncated = useMemo(() => abstract.slice(0, 320) + (abstract.length > 320 ? '…' : ''), [abstract]);

  const toggleExpand = () => setExpanded(p => !p);

  const saveArticle = useCallback(async () => {
    if (!isConnected || !username) return; // guard
    if (isSaving) return;
    setIsSaving(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const optimistic = !saved; // target state after action
    setSaved(optimistic);
    try {
      const endpoint = '/api/users/article';
      const res = await fetch(endpoint, {
        method: optimistic ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(
          optimistic
            ? { username, article: document }
            : { username, article_id: document.id }
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

  const categoryStyle = useMemo(() => {
    if (!category) return 'bg-white/10 text-gray-300';
    const c = category.toLowerCase();
    if (c.includes('cs')) return 'bg-sky-500/20 text-sky-200';
    if (c.includes('math') || c.includes('stat')) return 'bg-indigo-500/20 text-indigo-200';
    if (c.includes('bio') || c.includes('med')) return 'bg-emerald-500/20 text-emerald-200';
    if (c.includes('phys')) return 'bg-fuchsia-500/20 text-fuchsia-200';
    if (c.includes('econ') || c.includes('fin')) return 'bg-amber-500/20 text-amber-200';
    return 'bg-white/10 text-gray-300';
  }, [category]);

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
            {authors?.length ? authors.slice(0, 4).join(', ') + (authors.length > 4 ? ` +${authors.length - 4}` : '') : 'Unknown author'}
          </p>
          <p className="text-[11px] text-gray-500">Published {publishedDate}</p>
        </header>

        <div className="text-sm text-gray-200 leading-relaxed">
          <AnimatePresence initial={false} mode="wait">
            <motion.p
              key={expanded ? 'expanded' : 'collapsed'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={expanded ? '' : 'line-clamp-3'}
            >
              {expanded ? abstract : truncated}
            </motion.p>
          </AnimatePresence>
          {abstract.length > 320 && (
            <button
              type="button"
              onClick={toggleExpand}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-300 hover:text-indigo-200 transition-colors focus:outline-none focus:underline"
              aria-expanded={expanded}
            >
              {expanded ? 'Show less' : 'Read more'} <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <div className="flex flex-wrap gap-2">
          {pdfLink && (
            <Link
              href={pdfLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-3 py-1.5 text-[11px] font-medium rounded-md bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-sm transition-colors"
              aria-label="View PDF"
            >
              <span className="inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> PDF</span>
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
              <span className="inline-flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> arXiv</span>
            </Link>
          )}
          {/* Save button (only interactive if connected) */}
          <button
            type="button"
            disabled={!isConnected || isSaving}
            onClick={saveArticle}
            aria-pressed={saved}
            aria-label={isConnected ? (saved ? 'Unsave article' : 'Save article') : 'Sign in to save'}
            className={`px-3 py-1.5 text-[11px] cursor-pointer font-medium rounded-md border backdrop-blur-sm inline-flex items-center gap-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 disabled:opacity-40 disabled:cursor-not-allowed ${
              saved
                ? 'bg-background text-foreground hover:bg-background/80'
                : 'bg-white/10 border-white/10 hover:bg-white/15'
            }`}
            title={!isConnected ? 'Sign in to save this article' : saved ? 'Click to remove from saved' : 'Click to save'}
          >
            {saved ? (
              <BookmarkCheck className="w-3.5 h-3.5" />
            ) : (
              <BookmarkPlus className="w-3.5 h-3.5" />
            )}
            {isSaving ? '...' : saved ? 'Saved' : 'Save'}
          </button>
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
          {!isConnected && (
            <span className="text-[9px] text-gray-600 italic">Sign in to save</span>
          )}
          {isConnected && <span className="text-gray-600/70">@{username}</span>}
        </footer>
      </div>
    </motion.article>
  );
}
