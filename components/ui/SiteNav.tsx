'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, Users } from 'lucide-react';

import { apiFetch } from '@/lib/api';

type Destination = {
  href: string;
  label: string;
  icon: typeof Home;
  /** Profile and Groups are behind auth, so they only appear once signed in. */
  requiresAuth: boolean;
};

const DESTINATIONS: Destination[] = [
  { href: '/', label: 'Search', icon: Home, requiresAuth: false },
  { href: '/groups', label: 'Groups', icon: Users, requiresAuth: true },
  { href: '/profile', label: 'Profile', icon: User, requiresAuth: true },
];

/**
 * The nav shown on every page except the search page, which carries its own
 * links in its header.
 *
 * It resolves the session itself rather than taking it as a prop, so it can sit
 * in a Server Component (the article page) as easily as in a client one.
 */
export default function SiteNav() {
  const pathname = usePathname();
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch('/api/users/me', { method: 'GET' });
        if (!cancelled) setIsSignedIn(res.ok);
      } catch {
        // Signed out is the normal case here, not something to report.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <nav aria-label="Site" className="flex items-center gap-2 place-self-center mb-6">
      {DESTINATIONS.filter((destination) => !destination.requiresAuth || isSignedIn).map(
        ({ href, label, icon: Icon }) => {
          const isCurrent = href === '/' ? pathname === '/' : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={isCurrent ? 'page' : undefined}
              className={`flex items-center justify-center rounded-full p-2 transition-colors ${
                isCurrent
                  ? 'bg-foreground text-background ring-2 ring-foreground/20'
                  : 'bg-foreground/80 text-background hover:bg-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
            </Link>
          );
        }
      )}
    </nav>
  );
}
