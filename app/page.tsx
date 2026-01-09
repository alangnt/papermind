'use client';

import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  PanInfo,
  useAnimationControls,
} from 'motion/react';
import { ArrowUp, LoaderCircle, ArrowLeftRight, LogOut, Loader2, User, ArrowRight } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { InteractiveButton } from '@/components/buttons/InteractiveButton';
import { Waves } from '@/components/ui/WavesBackground';
import DocumentCard from '@/components/cards/DocumentCard';
import Footer from '@/components/ui/Footer';
import AuthComponent from '@/components/ui/Auth';
import { GooeyEffect } from '@/components/effects/GooeyEffect';

import { apiFetch, logout } from '@/lib/api';

import { Document, SearchType, SystemType } from '@/types/documents';
import { BaseUser } from '@/types/users';

export default function App() {
  const [user, setUser] = useState<BaseUser | null>(null);
  const [isAuthVisible, setIsAuthVisible] = useState<boolean>(false);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);

  const [searchType, setSearchType] = useState<SearchType>('manual');
  const [query, setQuery] = useState<string>('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [areDocumentsLoading, setAreDocumentsLoading] = useState<boolean>(false);
  const [isNewPageLoading, setIsNewPageLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [cardIndex, setCardIndex] = useState<number>(0);

  const [system, setSystem] = useState<SystemType>('classic');

  // Swipe the card animation
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-5, 5]);
  const controls = useAnimationControls();

  const getUserAccess = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    if (!token) return 1;

    try {
      const res = await apiFetch('/api/users/me', { method: 'GET' });

      if (!res.ok) {
        if (res.status === 401) logout();
        return 1;
      }

      const data = await res.json() as BaseUser;
      setUser(data as BaseUser);
      return 0;
    } catch (error) {
      console.error(error);
      return 1;
    }
  }, [setUser]);

  const getDocument = async (nextPage?: boolean, event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const targetPage = nextPage ? page + 1 : 1;
    if (!query.length) return;
    if (nextPage) {
      setIsNewPageLoading(true);
    } else {
      setAreDocumentsLoading(true);
      setPage(1);
    }
    let aiResponse = query;
    if (!nextPage) {
      const askAi = await fetch('/api/askAi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const aiData = await askAi.json();
      if (aiData && aiData.status) {
        setAreDocumentsLoading(false);
        setIsNewPageLoading(false);
        setDocuments([]);
        return;
      }
      aiResponse = aiData.content.length > 0 ? aiData.content : query;
    }
    let results;
    if (searchType === 'ai' && !nextPage) {
      const vectorSearch = await fetch('/api/vector_search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiResponse }),
      });
      results = await vectorSearch.json();
    } else {
      const manualSearch = await fetch('/api/get_documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiResponse, page: targetPage }),
      });
      results = await manualSearch.json();
    }
    setDocuments(results.documents || []);
    setPage(targetPage);
    setIsNewPageLoading(false);
    setAreDocumentsLoading(false);
    if (!nextPage) {
      await fetch('/api/embed_documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiResponse }),
      });
    }
    if (system === 'swipe' && cardIndex + 1 < results?.documents?.length) setCardIndex(cardIndex + 1);
  };

  const demoQueries: { name: string; subName: string; fullQuery: string }[] = [
    {
      name: 'What are the latest breakthroughs',
      subName: 'in quantum computing?',
      fullQuery: 'What are the latest breakthroughs in quantum computing?',
    },
    {
      name: 'How are scientists studying',
      subName: 'the possibility of life on exoplanets?',
      fullQuery: 'How are scientists studying the possibility of life on exoplanets?',
    },
    {
      name: "What's new in the fight",
      subName: 'against climate change using AI?',
      fullQuery: "What's new in the fight against climate change using AI?",
    },
    {
      name: 'What are the current challenges',
      subName: 'in nuclear fusion energy?',
      fullQuery: 'What are the current challenges in nuclear fusion energy?',
    },
  ];

  const swipeDocument = async (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    const duration = 0.25;

    // Not enough swipe: snap back smoothly
    if (info.offset.x <= threshold && info.offset.x >= -threshold) {
      await controls.start({
        x: 0,
        opacity: 1,
        transition: { type: 'spring', stiffness: 500, damping: 30 },
      });
      x.set(0);
      return;
    }

    // Swipe Right
    if (info.offset.x > threshold) {
      // Animate card off-screen to the right
      await controls.start({
        x: typeof window !== 'undefined' ? window.innerWidth : 500,
        opacity: 0,
        transition: { duration, ease: 'easeInOut' },
      });

      if (cardIndex + 1 >= documents.length) {
        await getDocument(true);
        // Prepare and animate new content in
        controls.set({ x: 40, opacity: 0 });
        x.set(0);
        await controls.start({
          x: 0,
          opacity: 1,
          transition: { type: 'spring', stiffness: 400, damping: 28 },
        });
      } else {
        setCardIndex((prev) => prev + 1);
        controls.set({ x: 40, opacity: 0 });
        x.set(0);
        await controls.start({
          x: 0,
          opacity: 1,
          transition: { type: 'spring', stiffness: 400, damping: 28 },
        });
      }
      return;
    }

    // Swipe Left
    if (info.offset.x < -threshold) {
      if (cardIndex === 0) {
        // Can't go left from the first card: bounce back
        await controls.start({
          x: 0,
          opacity: 1,
          transition: { type: 'spring', stiffness: 500, damping: 30 },
        });
        return;
      }
      // Animate card off-screen to the left
      await controls.start({
        x: typeof window !== 'undefined' ? -window.innerWidth : -500,
        opacity: 0,
        transition: { duration, ease: 'easeInOut' },
      });
      setCardIndex((prev) => prev - 1);
      controls.set({ x: -40, opacity: 0 });
      x.set(0);
      await controls.start({
        x: 0,
        opacity: 1,
        transition: { type: 'spring', stiffness: 400, damping: 28 },
      });
      return;
    }
  };

  const logout = async () => {
    if (!user || isSigningOut) return;
    setIsSigningOut(true);
    try {
      // Optional delay to show spinner / animate
      await new Promise<void>(res => setTimeout(res, 1000));
      localStorage.removeItem('access_token');
      setUser(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSigningOut(false);
    }
  }

  useEffect(() => {
    getUserAccess().then((res) => {
      if (res === 1) {
        setUser(null);
      }
    });
  }, [getUserAccess]);

  return (
    <div className="relative w-full overflow-hidden">
      <GooeyEffect />

      <div className="absolute inset-0 w-full pointer-events-none">
        <Waves
          lineColor={'rgba(0, 0, 0, 0.3)'}
          backgroundColor="transparent"
          waveSpeedX={0.02}
          waveSpeedY={0.01}
          waveAmpX={40}
          waveAmpY={20}
          friction={0.9}
          tension={0.01}
          maxCursorMove={120}
          xGap={12}
          yGap={36}
        />
      </div>

      {/* Authentication */}
      {!user && isAuthVisible && (
        <AuthComponent onLoggedIn={getUserAccess} setIsAuthVisible={setIsAuthVisible} />
      )}

      <div className="flex flex-col gap-y-2 grow w-full max-w-screen-md place-self-center text-gray-300 min-h-screen z-40">
        <header className="mb-6 px-4 lg:px-0 py-8 z-80">
          <div className="flex flex-col justify-center items-center text-center space-y-2">
            <h1 className="flex items-center gap-2 text-3xl md:text-4xl font-bold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-500 to-gray-700">
                Papermind
              </span>

              {user && (
                <motion.button
                  className='relative text-background bg-foreground/80 z-80 flex items-center justify-center rounded-full cursor-pointer transition overflow-visible focus:outline-none p-2'
                  aria-label='User profile'
                  initial='rest'
                  animate='rest'
                  whileHover='hover'
                  variants={{
                    rest: { paddingRight: '0.5rem' },
                    hover: { paddingRight: '1.75rem', transition: { type: 'spring', stiffness: 260, damping: 20 } }
                  }}
                >
                  <Link href={"/profile"}>
                    <User className='w-4 h-4' />
                    <motion.span
                      className='absolute top-1/2 -translate-y-1/2 right-1 flex items-center justify-center p-2'
                      variants={{
                        rest: { opacity: 0, x: 6, scale: 0.6 },
                        hover: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 18 } }
                      }}
                    >
                      <ArrowRight className='w-3 h-3' />
                    </motion.span>
                  </Link>
                </motion.button>
              )}
            </h1>
            <p className="text-sm text-gray-700">
              Search and explore research papers with AI-assisted queries.
            </p>
          </div>
        </header>

        <main className="flex flex-col gap-2 justify-center items-center grow py-4 px-4 lg:px-0">
          {documents.length === 0 && (
            <div data-testid="suggested-actions" className="grid pb-2 sm:grid-cols-2 gap-2 w-full">
              <AnimatePresence>
                {demoQueries.map((query, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ delay: 0.05 * index }}
                    key={`suggested-action-${index}`}
                    className={index > 1 ? 'hidden sm:block' : 'block'}
                  >
                    <button
                      onClick={() => setQuery(query.fullQuery)}
                      className="flex flex-col bg-foreground p-4 rounded-xl w-full text-left hover:bg-black/90 cursor-pointer transition"
                    >
                      <span className="font-medium">{query.name}</span>
                      <span className="text-gray-500">{query.subName}</span>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          <form
            className="flex flex-col gap-6 w-full bg-foreground p-4 border border-gray-400 rounded-xl"
            onSubmit={(e: FormEvent<HTMLFormElement>) => getDocument(false, e)}
          >
            <input
              type="text"
              value={query}
              autoFocus
              placeholder="I'm looking for..."
              onChange={(e) => setQuery(e.target.value)}
              className="text-sm w-full focus:outline-none focus:ring-O focus:border-transparent"
            />
            <div className="flex justify-between items-center gap-4">
              <div className="flex flex-col md:flex-row md:items-end gap-2 p-1 text-xs md:place-self-end">
                <button
                  type={'button'}
                  className="flex gap-1 items-center hover:underline transition cursor-pointer"
                  onClick={() => setSearchType(searchType === 'manual' ? 'ai' : 'manual')}
                >
                  {searchType === 'manual' ? 'Non-AI' : 'AI'}{' '}
                  <ArrowLeftRight className="w-3 h-3"></ArrowLeftRight>
                </button>

                <span className="text-xs text-gray-400 max-md:hidden">|</span>

                <p className="place-self-end">
                  Enter any scientific question and get a sample of research papers to work on.
                </p>
              </div>

              <div className='flex items-center gap-2'>
                {!user ? (
                  <div id="gooey-btn" className="relative flex items-center group" style={{ filter: "url(#gooey-filter)" }} onClick={() => setIsAuthVisible(true)}>
                    <div className="absolute right-0 px-2.5 py-2 rounded-full bg-background text-foreground font-semibold text-xs transition-all duration-300 hover:bg-background/90 cursor-pointer h-8 flex items-center justify-center lg:-translate-x-10 lg:group-hover:-translate-x-20 z-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                      </svg>
                    </div>

                    {/* Desktop View */}
                    <div className="max-lg:hidden px-6 py-2 rounded-full bg-background text-foreground font-semibold text-xs transition-all duration-300 hover:bg-background/90 cursor-pointer h-8 flex items-center z-10">
                      Sign in
                    </div>
                    {/* Mobile/Tablet View */}
                    <div className="lg:hidden p-2 rounded-full bg-background text-foreground font-semibold text-xs transition-all duration-300 hover:bg-background/90 cursor-pointer h-8 flex items-center z-10">
                      <User className='w-4 h-4' />
                    </div>
                  </div>
                ) : (
                  <div id="gooey-btn" className="relative flex items-center group z-80" style={{ filter: "url(#gooey-filter)" }} onClick={() => logout()}>
                    {!isSigningOut && (
                      <div className="absolute right-0 px-2.5 py-2 rounded-full bg-background text-foreground font-semibold text-xs transition-all duration-300 hover:bg-background/90 cursor-pointer h-8 flex items-center justify-center lg:-translate-x-10 lg:group-hover:-translate-x-23 z-0">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                        </svg>
                      </div>
                    )}
                    

                    <div className="max-lg:hidden px-6 py-2 space-x-2 rounded-full bg-background text-foreground font-semibold text-xs transition-all duration-300 hover:bg-background/90 cursor-pointer h-8 flex items-center z-10">
                      {isSigningOut && <Loader2 className='w-4 h-4 animate-spin' />}
                      <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
                    </div>
                    <div className="lg:hidden p-2 rounded-full bg-background text-foreground font-semibold text-xs transition-all duration-300 hover:bg-background/90 cursor-pointer h-8 flex items-center z-10">
                      {isSigningOut ? <Loader2 className='w-4 h-4 animate-spin' /> : <LogOut className='w-4 h-4' />}
                    </div>
                  </div>
                  
                )}

                <button
                  type="submit"
                  className="z-80 bg-white text-foreground p-2 rounded-full text-sm font-medium hover:bg-gray-200 disabled:bg-gray-400 transition cursor-pointer disabled:cursor-default"
                  disabled={areDocumentsLoading || query.length <= 0}
                >
                  {areDocumentsLoading ? (
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Link to the new matching game */}
          {documents.length > 0 && (
            <div
              className="underline z-80 text-foreground cursor-pointer"
              onClick={() => setSystem(system === 'classic' ? 'swipe' : 'classic')}
            >
              <p>
                {system === 'classic'
                  ? 'Do you want to try our new Swiping system ?'
                  : 'Do you want to go back to the classic system ?'}
              </p>
            </div>
          )}

          {/* Classic System */}
          {documents.length > 0 && system === 'classic' && (
            <div className={'grid grid-cols-1 sm:grid-cols-2 gap-4 text-center mt-6'}>
              {documents.map((document, index) => (
                <DocumentCard 
                  key={index} 
                  username={user?.username ?? undefined} 
                  document={document} 
                  isSaved={!!user?.saved_articles?.find((article) => article.id === document.id)}
                ></DocumentCard>
              ))}
            </div>
          )}

          {/* Swipe System */}
          {documents.length > 0 && system === 'swipe' && cardIndex >= 0 && cardIndex < documents.length && (
            <div className="relative w-full min-h-[360px] sm:min-h-[420px] md:min-h-[460px]">
              <motion.div
                style={{ rotate }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                whileHover={{ scale: 1.01 }}
                onDrag={(_e, info) => x.set(info.offset.x)}
                onDragEnd={async (event, info) => swipeDocument(event, info)}
                animate={controls}
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
              >
                <DocumentCard username={user?.username ?? undefined} document={documents[cardIndex]} isSaved={!!user?.saved_articles?.find(article => article.id === documents[cardIndex].id)}></DocumentCard>
              </motion.div>
            </div>
          )}

          {(system === 'swipe'
            ? documents.length > 0 && cardIndex === documents.length
            : documents.length > 0) && (
            <InteractiveButton>
              <button
                onClick={async () => {
                  await getDocument(true);
                }}
                className="mt-4 inline-flex items-center rounded-md border border-zinc-100 bg-foreground px-6 py-2 text-md text-background transition-all duration-300 hover:bg-gray-800 cursor-pointer"
                disabled={isNewPageLoading}
              >
                {isNewPageLoading ? <LoaderCircle className="w-6 h-6 animate-spin" /> : 'More'}
              </button>
            </InteractiveButton>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}
