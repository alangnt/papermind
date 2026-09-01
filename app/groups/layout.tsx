import type { Metadata } from 'next';
import { ReactNode } from 'react';

// Groups are private to their members: keep them out of the index and the sitemap.
export const metadata: Metadata = {
  title: 'Groups',
  robots: { index: false, follow: false },
};

export default function GroupsLayout({ children }: { children: ReactNode }) {
  return children;
}
