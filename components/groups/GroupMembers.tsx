'use client';

import { useState } from 'react';
import { LoaderCircle, UserMinus } from 'lucide-react';

type Props = {
  members: string[];
  owner: string;
  currentUser: string;
  isOwner: boolean;
  onRemove: (username: string) => Promise<void>;
};

export default function GroupMembers({ members, owner, currentUser, isOwner, onRemove }: Props) {
  const [removing, setRemoving] = useState<string | null>(null);

  const remove = async (username: string) => {
    setRemoving(username);
    try {
      await onRemove(username);
    } finally {
      setRemoving(null);
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
              {canRemove && (
                <button
                  type="button"
                  onClick={() => remove(member)}
                  disabled={removing === member}
                  aria-label={`Remove ${member} from the group`}
                  className="p-0.5 rounded-full text-gray-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {removing === member ? (
                    <LoaderCircle className="w-3 h-3 animate-spin" />
                  ) : (
                    <UserMinus className="w-3 h-3" />
                  )}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
