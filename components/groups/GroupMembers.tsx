'use client';

import { useState } from 'react';
import { Crown, LoaderCircle, UserMinus } from 'lucide-react';

type Props = {
  members: string[];
  owner: string;
  currentUser: string;
  isOwner: boolean;
  onRemove: (username: string) => Promise<void>;
  onTransfer: (username: string) => Promise<void>;
};

export default function GroupMembers({
  members,
  owner,
  currentUser,
  isOwner,
  onRemove,
  onTransfer,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  // Handing the group over cannot be undone by the person doing it, so the
  // crown asks once before it acts.
  const [confirming, setConfirming] = useState<string | null>(null);

  const remove = async (username: string) => {
    setBusy(username);
    try {
      await onRemove(username);
    } finally {
      setBusy(null);
    }
  };

  const transfer = async (username: string) => {
    setBusy(username);
    try {
      await onTransfer(username);
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  };

  return (
    <section className="space-y-2">
      <h2 className="text-xs uppercase tracking-wide text-gray-500 font-medium">
        Members ({members.length})
      </h2>
      <ul className="flex flex-wrap gap-2">
        {members.map((member) => {
          // The owner cannot be removed — they would leave the group unmanaged.
          const canRemove = isOwner && member !== owner && member !== currentUser;

          return (
            <li
              key={member}
              className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-gray-200"
            >
              <span>{member === currentUser ? `${member} (you)` : member}</span>
              {member === owner && <span className="text-[10px] text-gray-500">owner</span>}

              {canRemove && confirming === member ? (
                <button
                  type="button"
                  onClick={() => transfer(member)}
                  disabled={busy === member}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-400/20 text-amber-200 hover:bg-amber-400/30 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {busy === member ? (
                    <LoaderCircle className="w-3 h-3 animate-spin" />
                  ) : (
                    <Crown className="w-3 h-3" />
                  )}
                  Hand over?
                </button>
              ) : (
                canRemove && (
                  <button
                    type="button"
                    onClick={() => setConfirming(member)}
                    disabled={busy === member}
                    aria-label={`Make ${member} the owner of this group`}
                    title={`Make ${member} the owner`}
                    className="p-0.5 rounded-full text-gray-400 hover:text-amber-200 hover:bg-amber-400/10 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <Crown className="w-3 h-3" />
                  </button>
                )
              )}

              {canRemove && confirming !== member && (
                <button
                  type="button"
                  onClick={() => remove(member)}
                  disabled={busy === member}
                  aria-label={`Remove ${member} from the group`}
                  className="p-0.5 rounded-full text-gray-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {busy === member ? (
                    <LoaderCircle className="w-3 h-3 animate-spin" />
                  ) : (
                    <UserMinus className="w-3 h-3" />
                  )}
                </button>
              )}

              {confirming === member && (
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="text-[10px] text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  cancel
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
