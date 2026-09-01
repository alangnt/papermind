import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.papermind.ch'),
  title: {
    default: 'PaperMind - AI Research Assistant for Scientific Papers',
    template: '%s | PaperMind',
  },
  description:
    'Ask about research in plain English. An AI turns your question into the right search terms, then finds matching papers on arXiv — no query-crafting required.',
  keywords: [
    'AI research',
    'scientific papers',
    'arXiv',
    'paper search',
    'academic research',
    'research assistant',
    'preprints',
    'machine learning',
    'deep learning',
  ],
  authors: [{ name: 'Alan Geirnaert', url: 'https://www.linkedin.com/in/alan-geirnaert/' }],
  creator: 'Alan Geirnaert',
  publisher: 'PaperMind',
  alternates: {
    canonical: '/',
  },
  // og:image / twitter:image come from app/opengraph-image.png (+ .alt.txt) via the
  // file convention, which emits a content-hashed URL so social caches refresh on change.
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.papermind.ch/',
    title: 'PaperMind - AI Research Assistant for Scientific Papers',
    description: 'Ask a question in plain English and get the arXiv papers that answer it.',
    siteName: 'PaperMind',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PaperMind - AI Research Assistant',
    description: 'Ask a question in plain English and get the arXiv papers that answer it.',
    creator: '@gnt_alan',
    site: '@gnt_alan',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Icon links are generated from app/icon.png, app/apple-icon.png and
  // app/favicon.ico by the file convention; declaring them here duplicates them.
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased flex flex-col min-h-screen relative`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
