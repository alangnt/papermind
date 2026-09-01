'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, TriangleAlert } from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { setSignedIn } from '@/lib/authState';

type Props = {
  username: string;
};

/**
 * Irreversible, so it asks the account holder to type their own username rather
 * than offering a button a stray click could fire.
 */
export default function DeleteAccount({ username }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirmation.trim() === username;

  const remove = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!matches || isDeleting) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await apiFetch('/api/users/me', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Could not delete the account.');
        return;
      }

      // The server has cleared the cookies; tell the header before navigating,
      // then refresh so no cached view still assumes a session.
      setSignedIn(false);
      router.push('/');
      router.refresh();
    } catch (deleteError) {
      console.error(deleteError);
      setError('Could not delete the account.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
      >
        <TriangleAlert className="w-3.5 h-3.5" /> Delete my account
      </button>
    );
  }

  return (
    <form
      onSubmit={remove}
      className="w-full space-y-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-red-200">Delete your account</h3>
        <p className="text-[11px] text-gray-400">
          This cannot be undone. Your saved articles go with it. Groups you own pass to their
          longest-standing member, and any group where you are the only member is deleted. Papers
          you added to a group stay there, without your name.
        </p>
      </div>

      <label className="block text-[11px] text-gray-400">
        Type <span className="font-semibold text-gray-200">{username}</span> to confirm
        <input
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          className="mt-1 w-full p-2 rounded-md border border-white/20 bg-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-400/40"
        />
      </label>

      {error && (
        <p role="alert" className="text-[11px] text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!matches || isDeleting}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isDeleting && <LoaderCircle className="w-3.5 h-3.5 animate-spin" />}
          Delete permanently
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setConfirmation('');
            setError(null);
          }}
          className="px-3 py-2 text-xs font-medium rounded-md border border-white/15 text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
