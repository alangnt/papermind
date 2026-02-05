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
  description: 'Your own AI research assistant for all things sciences. Search and explore research papers with AI-assisted semantic search. Data sourced from arXiv.',
  keywords: ['AI research', 'semantic search', 'scientific papers', 'arXiv', 'RAG', 'vector search', 'academic research', 'research assistant', 'machine learning', 'deep learning'],
  authors: [{ name: 'Alan Geirnaert', url: 'https://www.linkedin.com/in/alan-geirnaert/' }],
  creator: 'Alan Geirnaert',
  publisher: 'PaperMind',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.papermind.ch/',
    title: 'PaperMind - AI Research Assistant for Scientific Papers',
    description: 'Search and explore research papers with AI-assisted semantic search powered by RAG and vector search.',
    siteName: 'PaperMind',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PaperMind - AI Research Assistant for Scientific Papers',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PaperMind - AI Research Assistant',
    description: 'Search and explore research papers with AI-assisted semantic search.',
    images: ['/og-image.png'],
    creator: '@gnt_alan',
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
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
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
