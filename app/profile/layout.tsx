import type { Metadata } from 'next';
import { ReactNode } from 'react';

// Logged-in-only route: keep it out of the index and out of the sitemap.
export const metadata: Metadata = {
  title: 'Profile',
  robots: { index: false, follow: false },
};

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return children;
}
