'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Link2, LoaderCircle, X } from 'lucide-react';

import { apiFetch } from '@/lib/api';

type Props = {
  groupId: string;
};

/**
 * Invite-link controls, owner only.
 *
 * The link is never fetched back from the server — a group read deliberately
 * omits the token — so it is only ever on screen right after being minted.
 * Leaving the page means minting a fresh one, which also revokes the old.
 */
export default function GroupInvite({ groupId }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const mint = useCallback(async () => {
    setIsWorking(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/groups/${groupId}/invite`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? 'Could not create an invite link.');
        return;
      }

      setUrl(data.url);
      setExpiresAt(data.expiresAt);
    } catch (mintError) {
      console.error(mintError);
      setError('Could not create an invite link.');
    } finally {
      setIsWorking(false);
    }
  }, [groupId]);

  const revoke = useCallback(async () => {
    setIsWorking(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/groups/${groupId}/invite`, { method: 'DELETE' });
      if (!res.ok) {
        setError('Could not revoke the link.');
        return;
      }

      setUrl(null);
      setExpiresAt(null);
    } catch (revokeError) {
      console.error(revokeError);
      setError('Could not revoke the link.');
    } finally {
      setIsWorking(false);
    }
  }, [groupId]);

  const copy = useCallback(async () => {
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch (copyError) {
      console.error('Could not copy the invite link', copyError);
    }
  }, [url]);

  return (
    <section className="space-y-2">
      <h2 className="text-xs uppercase tracking-wide text-gray-500 font-medium">Invite people</h2>

      {url ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/5 border border-white/10">
            <span className="text-[11px] text-gray-300 truncate flex-1">{url}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md bg-white text-black hover:bg-gray-200 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={revoke}
              disabled={isWorking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md bg-white/10 hover:bg-white/15 border border-white/10 transition-colors cursor-pointer disabled:opacity-40"
            >
              <X className="w-3.5 h-3.5" /> Revoke
            </button>
          </div>
          <p className="text-[10px] text-gray-500">
            Anyone signed in who opens this link joins the group. It stops working on{' '}
            {expiresAt ? new Date(expiresAt).toLocaleDateString() : 'expiry'}, or as soon as you
            create a new one. Copy it now — it is not shown again.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={mint}
            disabled={isWorking}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md bg-white/10 hover:bg-white/15 border border-white/10 transition-colors cursor-pointer disabled:opacity-40"
          >
            {isWorking ? (
              <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Link2 className="w-3.5 h-3.5" />
            )}
            Create an invite link
          </button>
          <p className="text-[10px] text-gray-500">
            Creating a link replaces any link already out there.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-[11px] text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
