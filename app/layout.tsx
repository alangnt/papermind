import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { ReactNode } from 'react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PaperMind",
  description: "Your own AI research assistant for all things sciences. Data sourced from arXiv.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} antialiased flex flex-col min-h-screen relative`}
      >
        {children}
      </body>
    </html>
  );
}
