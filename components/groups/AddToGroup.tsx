'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, FolderPlus, LoaderCircle, Plus, X } from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { Group } from '@/types/groups';

type Props = {
  arxivId: string;
  title: string;
  onClose: () => void;
};

const MAX_NAME_LENGTH = 60;

/**
 * Picker for adding a paper to one of your groups.
 *
 * A centered dialog rather than an anchored popover, and portalled to the body:
 * the swipe deck rotates its card, and a transformed ancestor would both
 * mis-position a fixed overlay and clip an absolutely positioned one.
 */
export default function AddToGroup({ arxivId, title, onClose }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch('/api/groups', { method: 'GET' });
        if (cancelled) return;

        if (!res.ok) {
          setError('Could not load your groups.');
          return;
        }

        const data = (await res.json()) as { groups: Group[] };
        if (!cancelled) setGroups(data.groups);
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) setError('Could not load your groups.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const holdsPaper = (group: Group) =>
    group.articles.some((article) => article.arxiv_id === arxivId);

  const toggle = useCallback(
    async (group: Group) => {
      if (pending) return;

      // Checked inline rather than through the helper so this callback does not
      // depend on a function rebuilt on every render.
      const isIn = group.articles.some((article) => article.arxiv_id === arxivId);
      setPending(group.id);
      setError(null);

      try {
        const res = await apiFetch(`/api/groups/${group.id}/articles`, {
          method: isIn ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ arxiv_id: arxivId }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? 'That did not work. Try again.');
          return;
        }

        // Track membership locally so the tick flips without refetching the list.
        setGroups((current) =>
          current.map((candidate) =>
            candidate.id !== group.id
              ? candidate
              : {
                  ...candidate,
                  articleCount: candidate.articleCount + (isIn ? -1 : 1),
                  articles: isIn
                    ? candidate.articles.filter((article) => article.arxiv_id !== arxivId)
                    : [
                        ...candidate.articles,
                        { arxiv_id: arxivId, added_by: '', added_at: new Date().toISOString() },
                      ],
                }
          )
        );
      } catch (toggleError) {
        console.error(toggleError);
        setError('That did not work. Try again.');
      } finally {
        setPending(null);
      }
    },
    [arxivId, pending]
  );

  const createAndAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = newName.trim();
    if (!trimmed || isCreating) return;

    setIsCreating(true);
    setError(null);

    try {
      const res = await apiFetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Could not create the group.');
        return;
      }

      const created = data.group as Group;
      setGroups((current) => [created, ...current]);
      setNewName('');
      // Creating a group from here means you want the paper in it.
      await toggle(created);
    } catch (createError) {
      console.error(createError);
      setError('Could not create the group.');
    } finally {
      setIsCreating(false);
    }
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Add this paper to a group"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative w-full max-w-md bg-foreground border border-gray-700 rounded-2xl p-5 shadow-2xl text-white space-y-4"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Add to a group</h2>
              <p className="text-[11px] text-gray-400 truncate">{title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1].map((index) => (
                <div key={index} className="h-9 rounded-md bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <p className="text-[11px] text-gray-400">
              You have no groups yet. Name one below and this paper goes straight into it.
            </p>
          ) : (
            <ul className="space-y-1 max-h-56 overflow-y-auto">
              {groups.map((group) => {
                const isIn = holdsPaper(group);

                return (
                  <li key={group.id}>
                    <button
                      type="button"
                      onClick={() => toggle(group)}
                      disabled={pending !== null}
                      aria-pressed={isIn}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs truncate">{group.name}</span>
                        <span className="block text-[10px] text-gray-500">
                          {group.articleCount} {group.articleCount === 1 ? 'paper' : 'papers'}
                        </span>
                      </span>
                      {pending === group.id ? (
                        <LoaderCircle className="w-3.5 h-3.5 animate-spin text-gray-400" />
                      ) : isIn ? (
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <form onSubmit={createAndAdd} className="flex gap-2 pt-1 border-t border-gray-700">
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              maxLength={MAX_NAME_LENGTH}
              placeholder="New group…"
              aria-label="New group name"
              className="flex-1 mt-3 px-2 py-1.5 rounded-md bg-white/10 border border-white/20 text-xs focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <button
              type="submit"
              disabled={!newName.trim() || isCreating}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md bg-white text-black hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FolderPlus className="w-3.5 h-3.5" />
              )}
              Create
            </button>
          </form>

          {error && (
            <p role="alert" className="text-[11px] text-red-300">
              {error}
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    window.document.body
  );
}
