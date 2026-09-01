'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { ArrowRight, FolderPlus, LoaderCircle, Users } from 'lucide-react';

import { GooeyEffect } from '@/components/effects/GooeyEffect';
import { Waves } from '@/components/ui/WavesBackground';
import Footer from '@/components/ui/Footer';
import SiteNav from '@/components/ui/SiteNav';

import { apiFetch } from '@/lib/api';
import { Group } from '@/types/groups';
import { BaseUser } from '@/types/users';

const MAX_NAME_LENGTH = 60;

/**
 * The dark card the whole app uses for content sitting on the wave backdrop —
 * same treatment as DocumentCard and the article page.
 */
const SURFACE = 'rounded-2xl border border-gray-700 bg-foreground text-white shadow-lg p-5 md:p-6';

export default function GroupsPage() {
  const [user, setUser] = useState<BaseUser | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  const [groups, setGroups] = useState<Group[]>([]);
  const [areGroupsLoading, setAreGroupsLoading] = useState(true);

  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    try {
      const res = await apiFetch('/api/groups', { method: 'GET' });
      if (!res.ok) return;

      const data = (await res.json()) as { groups: Group[] };
      setGroups(data.groups);
    } catch (loadError) {
      console.error(loadError);
    } finally {
      setAreGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch('/api/users/me', { method: 'GET' });
        if (cancelled) return;

        if (!res.ok) {
          setIsCheckingAccess(false);
          setAreGroupsLoading(false);
          return;
        }

        setUser((await res.json()) as BaseUser);
        setIsCheckingAccess(false);
        await loadGroups();
      } catch (accessError) {
        console.error(accessError);
        if (!cancelled) {
          setIsCheckingAccess(false);
          setAreGroupsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadGroups]);

  const createGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = name.trim();
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

      // Prepend rather than refetch: the list is sorted most recently touched first.
      setGroups((current) => [data.group as Group, ...current]);
      setName('');
    } catch (createError) {
      console.error(createError);
      setError('Could not create the group.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative w-full overflow-hidden">
      <GooeyEffect />

      <div className="absolute inset-0 w-full pointer-events-none">
        <Waves
          lineColor="rgba(0, 0, 0, 0.3)"
          backgroundColor="transparent"
          waveSpeedX={0.02}
          waveSpeedY={0.01}
          waveAmpX={40}
          waveAmpY={20}
          friction={0.9}
          tension={0.01}
          maxCursorMove={120}
          xGap={12}
          yGap={36}
        />
      </div>

      {/* min-h-screen plus a growing <main> is what pins the footer to the
          bottom edge instead of leaving it under short content. */}
      <div className="relative z-40 flex flex-col w-full max-w-3xl place-self-center min-h-screen px-4 lg:px-0 py-8">
        <SiteNav />

        <main className="grow flex flex-col">
          {/* The backdrop is busy line art, so content sits on an opaque card
              rather than directly on top of it. */}
          <div className={SURFACE}>
            {isCheckingAccess ? (
              <p className="text-sm text-gray-400 text-center py-6">Checking access…</p>
            ) : !user ? (
              <div className="flex flex-col items-center gap-3 text-center py-4">
                <h1 className="text-xl font-semibold text-white">Groups are for signed-in users</h1>
                <p className="text-sm text-gray-400 max-w-md">
                  Sign in from the home page to create a group and share papers with other people.
                </p>
                <Link
                  href="/"
                  className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-white text-black hover:bg-gray-200 transition-colors"
                >
                  Go to Papermind <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <>
                <header className="text-center space-y-1 mb-6">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    <span className="bg-clip-text text-transparent bg-linear-to-r from-white to-gray-400">
                      Your groups
                    </span>
                  </h1>
                  <p className="text-xs text-gray-400">
                    Shared folders of papers. Invite people and build a reading list together.
                  </p>
                </header>

                <form onSubmit={createGroup} className="flex flex-col sm:flex-row gap-2 mb-6">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={MAX_NAME_LENGTH}
                    placeholder="Name a new group…"
                    aria-label="New group name"
                    className="flex-1 p-2 rounded-lg text-sm text-white bg-white/10 border border-white/20 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30 transition"
                  />
                  <button
                    type="submit"
                    disabled={!name.trim() || isCreating}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-white text-black hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FolderPlus className="w-3.5 h-3.5" />
                    )}
                    Create group
                  </button>
                </form>

                {error && (
                  <p role="alert" className="text-xs text-red-300 mb-4 text-center">
                    {error}
                  </p>
                )}

                {areGroupsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[0, 1].map((index) => (
                      <div
                        key={index}
                        className="h-24 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
                      />
                    ))}
                  </div>
                ) : groups.length === 0 ? (
                  <div className="text-center py-8 space-y-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03]">
                    <Users className="w-6 h-6 mx-auto text-gray-500" />
                    <p className="text-sm text-gray-200">You are not in any group yet.</p>
                    <p className="text-xs text-gray-500">
                      Create one above, or open an invite link someone sent you.
                    </p>
                  </div>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AnimatePresence initial={false}>
                      {groups.map((group) => (
                        <motion.li
                          key={group.id}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                        >
                          <Link
                            href={`/groups/${group.id}`}
                            className="flex flex-col justify-between gap-3 h-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 text-white transition-colors"
                          >
                            <div className="space-y-1">
                              <h2 className="font-semibold text-sm leading-snug">{group.name}</h2>
                              <p className="text-[11px] text-gray-400">
                                {group.isOwner ? 'You own this group' : `Owned by ${group.owner}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-gray-400">
                              <span>
                                {group.articleCount} {group.articleCount === 1 ? 'paper' : 'papers'}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {group.members.length}
                              </span>
                            </div>
                          </Link>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
