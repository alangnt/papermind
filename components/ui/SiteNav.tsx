'use client';

import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowRight, Home, Folders, User } from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { getAuthSnapshot, getServerAuthSnapshot, subscribeAuth } from '@/lib/authState';
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
  { href: '/groups', label: 'Groups', icon: Folders, requiresAuth: true },
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

  // Subscribed rather than fetched-once, so signing in or out anywhere in the
  // app updates the header immediately instead of waiting for a reload.
  const signedIn = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getServerAuthSnapshot);
  const isSignedIn = signedIn === true;

  useEffect(() => {
    // Only probe when nothing has established the session yet; apiFetch
    // publishes the result into the shared store for every subscriber.
    if (signedIn !== null) return;

    void apiFetch('/api/users/me', { method: 'GET' }).catch(() => {
      // Signed out is the normal case here, not something to report.
    });
  }, [signedIn]);

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
            // The page you are already on has nowhere to take you, so it neither
            // widens nor reveals the arrow.
            whileHover={isCurrent ? undefined : 'hover'}
            whileTap={isCurrent ? undefined : { scale: 0.94 }}
            variants={PILL}
            transition={SPRING}
            className={`relative flex items-center justify-center rounded-full p-2 overflow-visible text-background focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
              isCurrent ? 'bg-foreground' : 'bg-foreground/70 hover:bg-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            {!isCurrent && (
              <motion.span
                aria-hidden
                variants={ARROW}
                className="absolute top-1/2 -translate-y-1/2 right-1 flex items-center justify-center p-2"
              >
                <ArrowRight className="w-3 h-3" />
              </motion.span>
            )}
          </MotionLink>
        );
      })}
    </nav>
  );
}
