'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, LoaderCircle, LogOut, Pencil, Trash2, X } from 'lucide-react';

import DocumentCard from '@/components/cards/DocumentCard';
import GroupInvite from '@/components/groups/GroupInvite';
import GroupMembers from '@/components/groups/GroupMembers';
import Footer from '@/components/ui/Footer';
import { Waves } from '@/components/ui/WavesBackground';

import { apiFetch } from '@/lib/api';
import { Document } from '@/types/documents';
import { Group } from '@/types/groups';
import { BaseUser } from '@/types/users';

const MAX_NAME_LENGTH = 60;

export default function GroupPage() {
  const params = useParams<{ id: string }>();
  const groupId = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? '');
  const router = useRouter();

  const [user, setUser] = useState<BaseUser | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [meRes, groupRes] = await Promise.all([
          apiFetch('/api/users/me', { method: 'GET' }),
          apiFetch(`/api/groups/${groupId}`, { method: 'GET' }),
        ]);
        if (cancelled) return;

        if (meRes.ok) setUser((await meRes.json()) as BaseUser);

        if (!groupRes.ok) {
          setLoadError(
            groupRes.status === 401
              ? 'Sign in to open this group.'
              : 'This group does not exist, or you are not a member of it.'
          );
          return;
        }

        const data = (await groupRes.json()) as { group: Group; documents: Document[] };
        if (cancelled) return;

        setGroup(data.group);
        setDocuments(data.documents);
      } catch (error) {
        console.error(error);
        if (!cancelled) setLoadError('Could not load this group.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const rename = async () => {
    const trimmed = draftName.trim();
    if (!group || !trimmed || trimmed === group.name) {
      setIsRenaming(false);
      return;
    }

    setIsBusy(true);
    try {
      const res = await apiFetch(`/api/groups/${group.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) setGroup({ ...group, name: trimmed });
    } catch (error) {
      console.error(error);
    } finally {
      setIsBusy(false);
      setIsRenaming(false);
    }
  };

  /** `documentId` is arXiv's abs URL; the API normalises it to a bare id. */
  const removePaper = async (documentId: string) => {
    if (!group) return;

    // Optimistic: the card disappears immediately, and is restored on failure.
    const previous = documents;
    setDocuments((current) => current.filter((doc) => doc.id !== documentId));

    try {
      const res = await apiFetch(`/api/groups/${group.id}/articles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arxiv_id: documentId }),
      });
      if (!res.ok) setDocuments(previous);
    } catch (error) {
      console.error(error);
      setDocuments(previous);
    }
  };

  const removeMember = async (username: string) => {
    if (!group) return;

    try {
      const res = await apiFetch(`/api/groups/${group.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        setGroup({ ...group, members: group.members.filter((member) => member !== username) });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const leave = async () => {
    if (!group) return;

    setIsBusy(true);
    try {
      const res = await apiFetch(`/api/groups/${group.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) router.push('/groups');
    } catch (error) {
      console.error(error);
    } finally {
      setIsBusy(false);
    }
  };

  const destroy = async () => {
    if (!group) return;

    setIsBusy(true);
    try {
      const res = await apiFetch(`/api/groups/${group.id}`, { method: 'DELETE' });
      if (res.ok) router.push('/groups');
    } catch (error) {
      console.error(error);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="relative w-full overflow-hidden">
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

      <div className="relative z-40 flex flex-col grow w-full max-w-3xl place-self-center min-h-screen px-4 lg:px-0 py-8">
        <Link
          href="/groups"
          className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors mb-6 w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All groups
        </Link>

        {isLoading ? (
          <div className="h-40 rounded-2xl bg-foreground/10 border border-black/5 animate-pulse" />
        ) : loadError || !group ? (
          <div className="text-center space-y-3 py-10">
            <h1 className="text-xl font-semibold text-gray-800">Group unavailable</h1>
            <p className="text-sm text-gray-600 max-w-md mx-auto">{loadError}</p>
            <Link
              href="/groups"
              className="inline-block px-4 py-2 text-xs font-medium rounded-md bg-foreground text-white hover:bg-foreground/90 transition-colors"
            >
              Back to your groups
            </Link>
          </div>
        ) : (
          <div className="bg-foreground border border-gray-700 rounded-2xl p-6 md:p-8 shadow-lg text-white space-y-6">
            <header className="space-y-2">
              {isRenaming ? (
                <div className="flex items-center gap-2">
                  <input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    maxLength={MAX_NAME_LENGTH}
                    autoFocus
                    aria-label="Group name"
                    className="flex-1 px-2 py-1 rounded-md bg-white/10 border border-white/20 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                  <button
                    type="button"
                    onClick={rename}
                    disabled={isBusy}
                    aria-label="Save the new name"
                    className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRenaming(false)}
                    aria-label="Cancel renaming"
                    className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-semibold leading-snug flex-1">
                    {group.name}
                  </h1>
                  {group.isOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftName(group.name);
                        setIsRenaming(true);
                      }}
                      aria-label="Rename this group"
                      className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
              <p className="text-[11px] text-gray-400">
                {group.isOwner ? 'You own this group' : `Owned by ${group.owner}`} ·{' '}
                {group.articleCount} {group.articleCount === 1 ? 'paper' : 'papers'}
              </p>
            </header>

            <GroupMembers
              members={group.members}
              owner={group.owner}
              currentUser={user?.username ?? ''}
              isOwner={group.isOwner}
              onRemove={removeMember}
            />

            {group.isOwner && <GroupInvite groupId={group.id} />}

            <section className="space-y-3">
              <h2 className="text-xs uppercase tracking-wide text-gray-500 font-medium">Papers</h2>

              {documents.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No papers yet. Search on the home page and use{' '}
                  <span className="text-gray-200">Add to group</span> on any result.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {documents.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      username={user?.username ?? undefined}
                      isSaved={!!user?.saved_articles?.some((saved) => saved.id === doc.id)}
                      onRemove={() => removePaper(doc.id)}
                      removeLabel="Remove from group"
                    />
                  ))}
                </div>
              )}
            </section>

            <footer className="pt-4 border-t border-gray-700 flex flex-wrap gap-2">
              {group.isOwner ? (
                <button
                  type="button"
                  onClick={destroy}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {isBusy ? (
                    <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Delete this group
                </button>
              ) : (
                <button
                  type="button"
                  onClick={leave}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-white/10 hover:bg-white/15 border border-white/10 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {isBusy ? (
                    <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5" />
                  )}
                  Leave this group
                </button>
              )}
            </footer>
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}
