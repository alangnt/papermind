'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoaderCircle, LogIn, UserPlus, Users } from 'lucide-react';

import AuthComponent from '@/components/ui/Auth';
import Footer from '@/components/ui/Footer';
import { Waves } from '@/components/ui/WavesBackground';

import { apiFetch } from '@/lib/api';

type Preview = {
  id: string;
  name: string;
  owner: string;
  memberCount: number;
  articleCount: number;
};

type Status = 'loading' | 'signed-out' | 'ready' | 'invalid';

export default function JoinGroupPage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params?.token) ? params.token[0] : (params?.token ?? '');
  const router = useRouter();

  const [status, setStatus] = useState<Status>('loading');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isAuthVisible, setIsAuthVisible] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * The preview endpoint is authenticated, so a 401 is how we learn the visitor
   * is signed out rather than that the invite is bad. That distinction matters:
   * someone arriving from a QR code or a pasted link often has no session yet.
   */
  const loadPreview = useCallback(async (): Promise<void> => {
    try {
      const res = await apiFetch(`/api/groups/join?token=${encodeURIComponent(token)}`, {
        method: 'GET',
      });

      if (res.status === 401) {
        setStatus('signed-out');
        return;
      }

      if (!res.ok) {
        setStatus('invalid');
        return;
      }

      setPreview((await res.json()) as Preview);
      setStatus('ready');
    } catch (previewError) {
      console.error(previewError);
      setStatus('invalid');
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        if (!cancelled) setStatus('invalid');
        return;
      }
      await loadPreview();
    })();

    return () => {
      cancelled = true;
    };
  }, [token, loadPreview]);

  const join = async () => {
    if (isJoining) return;

    setIsJoining(true);
    setError(null);

    try {
      const res = await apiFetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Could not join this group.');
        return;
      }

      router.push(`/groups/${data.id}`);
    } catch (joinError) {
      console.error(joinError);
      setError('Could not join this group.');
    } finally {
      setIsJoining(false);
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

      {isAuthVisible && (
        <AuthComponent onLoggedIn={loadPreview} setIsAuthVisible={setIsAuthVisible} />
      )}

      <div className="relative z-40 flex flex-col items-center justify-center grow w-full max-w-lg place-self-center min-h-screen px-4 py-8">
        {status === 'loading' ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <LoaderCircle className="w-4 h-4 animate-spin" /> Checking this invite…
          </div>
        ) : status === 'invalid' ? (
          <div className="text-center space-y-3">
            <h1 className="text-xl font-semibold text-gray-800">This invite is no longer valid</h1>
            <p className="text-sm text-gray-600">
              Invite links expire after a week, and are replaced whenever the owner creates a new
              one. Ask them for a fresh link.
            </p>
            <Link
              href="/"
              className="inline-block px-4 py-2 text-xs font-medium rounded-md bg-foreground text-white hover:bg-foreground/90 transition-colors"
            >
              Go to Papermind
            </Link>
          </div>
        ) : status === 'signed-out' ? (
          <div className="text-center space-y-3">
            <Users className="w-7 h-7 mx-auto text-gray-500" />
            <h1 className="text-xl font-semibold text-gray-800">
              You have been invited to a group
            </h1>
            <p className="text-sm text-gray-600">
              Sign in or create an account to join it. The invite stays valid while you do.
            </p>
            <button
              type="button"
              onClick={() => setIsAuthVisible(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-foreground text-white hover:bg-foreground/90 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign in to continue
            </button>
          </div>
        ) : (
          preview && (
            <div className="w-full bg-foreground border border-gray-700 rounded-2xl p-6 shadow-lg text-white space-y-5 text-center">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">
                  You have been invited to
                </p>
                <h1 className="text-xl font-semibold leading-snug">{preview.name}</h1>
                <p className="text-[11px] text-gray-400">
                  Owned by {preview.owner} · {preview.memberCount}{' '}
                  {preview.memberCount === 1 ? 'member' : 'members'} · {preview.articleCount}{' '}
                  {preview.articleCount === 1 ? 'paper' : 'papers'}
                </p>
              </div>

              <button
                type="button"
                onClick={join}
                disabled={isJoining}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-white text-black hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-40"
              >
                {isJoining ? (
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
                Join this group
              </button>

              {error && (
                <p role="alert" className="text-[11px] text-red-300">
                  {error}
                </p>
              )}

              <p className="text-[10px] text-gray-500">
                Members can add and remove papers. You can leave at any time.
              </p>
            </div>
          )
        )}

        <Footer />
      </div>
    </div>
  );
}
