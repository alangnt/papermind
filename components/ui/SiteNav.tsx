'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowRight, Home, User, Users } from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

/** Letting motion drive the Link itself means the pill, not a wrapper, grows. */
const MotionLink = motion.create(Link);

const SPRING = { type: 'spring', stiffness: 260, damping: 20 } as const;

/** The pill widens to make room for the arrow that slides in on hover. */
const PILL = {
  rest: { paddingRight: '0.5rem' },
  hover: { paddingRight: '1.75rem', transition: SPRING },
};

const ARROW = {
  rest: { opacity: 0, x: 6, scale: 0.6 },
  hover: { opacity: 1, x: 0, scale: 1, transition: { ...SPRING, stiffness: 300, damping: 18 } },
};

type Destination = {
  href: string;
  label: string;
  icon: typeof Home;
  /** Groups and Profile are behind auth, so they only appear once signed in. */
  requiresAuth: boolean;
};

const DESTINATIONS: Destination[] = [
  { href: '/', label: 'Search', icon: Home, requiresAuth: false },
  { href: '/groups', label: 'Groups', icon: Users, requiresAuth: true },
  { href: '/profile', label: 'Profile', icon: User, requiresAuth: true },
];

/**
 * The one header, used on every page.
 *
 * It resolves the session itself rather than taking it as a prop, so it drops
 * into a Server Component (the article page) as readily as a client one.
 */
export default function SiteNav({ className = '' }: { className?: string }) {
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

  const visible = DESTINATIONS.filter((destination) => !destination.requiresAuth || isSignedIn);

  return (
    // The spacing below the header belongs to the header, not to every page that
    // renders it. cn() still lets a caller override the default.
    <nav
      aria-label="Site"
      className={cn('flex items-center justify-center gap-2 z-80 mb-6', className)}
    >
      {visible.map(({ href, label, icon: Icon }) => {
        const isCurrent = href === '/' ? pathname === '/' : pathname.startsWith(href);

        return (
          <MotionLink
            key={href}
            href={href}
            aria-label={label}
            aria-current={isCurrent ? 'page' : undefined}
            // layout keeps the row settling smoothly as Groups and Profile
            // appear once the session resolves, rather than snapping wider.
            layout
            initial="rest"
            animate="rest"
            whileHover="hover"
            whileTap={{ scale: 0.94 }}
            variants={PILL}
            transition={SPRING}
            className={`relative flex items-center justify-center rounded-full p-2 overflow-visible text-background focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
              isCurrent ? 'bg-foreground' : 'bg-foreground/70 hover:bg-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            <motion.span
              aria-hidden
              variants={ARROW}
              className="absolute top-1/2 -translate-y-1/2 right-1 flex items-center justify-center p-2"
            >
              <ArrowRight className="w-3 h-3" />
            </motion.span>
          </MotionLink>
        );
      })}
    </nav>
  );
}
