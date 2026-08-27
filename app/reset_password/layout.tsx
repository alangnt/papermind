import type { Metadata } from 'next';
import { ReactNode } from 'react';

// Token-bearing URLs: never index these.
export const metadata: Metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
