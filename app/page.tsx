'use client'

import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { ArrowUp, LoaderCircle, ArrowLeftRight } from 'lucide-react';
import { FormEvent, useState } from 'react';

import { InteractiveButton } from '@/components/buttons/InteractiveButton';
import { Waves } from '@/components/ui/WavesBackground';
import DocumentCard from '@/components/cards/DocumentCard';
import Footer from '@/components/ui/Footer';

import { Document, SearchType, SystemType } from '@/types/documents';

export default function App() {
  const [searchType, setSearchType] = useState<SearchType>('manual');
  const [query, setQuery] = useState<string>('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [areDocumentsLoading, setAreDocumentsLoading] = useState<boolean>(false);
  const [isNewPageLoading, setIsNewPageLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [cardIndex, setCardIndex] = useState<number>(0);

  const [system, setSystem] = useState<SystemType>("classic");

  // Swipe the card animation
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-5, 5]);
  
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
      const vectorSearch = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vector_search/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiResponse }),
      });
      results = await vectorSearch.json();
    } else {
      const manualSearch = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_documents/`, {
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
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/embed_documents/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiResponse }),
      });
    }
    if (system === 'swipe') setCardIndex(cardIndex + 1);
  };

  const demoQueries: { name: string; subName: string; fullQuery: string }[] = [
    { name: "What are the latest breakthroughs", subName: "in quantum computing?", fullQuery: "What are the latest breakthroughs in quantum computing?" },
    { name: "How are scientists studying", subName: "the possibility of life on exoplanets?", fullQuery: "How are scientists studying the possibility of life on exoplanets?" },
    { name: "What's new in the fight", subName: "against climate change using AI?", fullQuery: "What's new in the fight against climate change using AI?" },
    { name: "What are the current challenges", subName: "in nuclear fusion energy?", fullQuery: "What are the current challenges in nuclear fusion energy?" },
  ];

  const swipeDocument = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (cardIndex + 1 >= documents.length) await getDocument(true);
    else {
      if (info.offset.x > 100) {
        // Handle Right Swipe Logic
        setCardIndex((prev) => prev + 1);
      } else if (info.offset.x < -100) {
        // Handle Left Swipe Logic
        if (cardIndex === 0) return;
        setCardIndex((prev) => prev - 1);
      }
    }
  }
  
  return (
    <div className="relative w-full">
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
      <div className="flex flex-col gap-y-2 grow w-full max-w-screen-md place-self-center text-gray-300 min-h-screen z-40">
        <header className="mb-6 px-4 lg:px-0 py-8 z-90">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-500 to-gray-700">Papermind</span>
            </h1>
            <p className="text-sm text-gray-700">
              Search and explore research papers with AI-assisted queries.
            </p>
          </div>
        </header>
        <main className="flex flex-col gap-2 justify-center items-center grow py-4 px-4 lg:px-0">
          <div
            data-testid="suggested-actions"
            className="grid pb-2 sm:grid-cols-2 gap-2 w-full"
          >
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
                    <span className="text-gray-500">
                      {query.subName}
                    </span>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <form
            className="flex flex-col gap-6 w-full bg-foreground p-4 border border-gray-400 rounded-xl"
            onSubmit={(e: FormEvent<HTMLFormElement>) => getDocument(false, e)}
          >
            <input
              type="text"
              value={query}
              autoFocus
              placeholder="I'm looking for..."
              onChange={e => setQuery(e.target.value)}
              className="text-sm w-full focus:outline-none focus:ring-O focus:border-transparent"
            />
            <div className="flex justify-between items-center gap-4">
              <div className='flex flex-col md:flex-row md:items-end gap-2 p-1 text-xs md:place-self-end'>
                <button 
                  className='flex gap-1 items-center hover:underline transition cursor-pointer'
                  onClick={() => setSearchType(searchType === "manual" ? "ai" : "manual")}
                >
                  {searchType === 'manual' ? 'Non-AI' : 'AI'} <ArrowLeftRight className='w-3 h-3'></ArrowLeftRight>
                </button>

                <span className='text-xs text-gray-400 max-md:hidden'>|</span>

                <p className="place-self-end">
                Enter any scientific question and get a sample of research papers to work on.
                </p>
              </div>
              
              <button
                type="submit"
                className="z-90 bg-white text-foreground p-2 rounded-full text-sm font-medium hover:bg-gray-200 transition cursor-pointer"
                disabled={areDocumentsLoading}
              >
                {areDocumentsLoading ? (
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>

          {/* Link to the new matching game */}
          {documents.length > 0 && (
            <div 
              className='underline z-90 text-foreground cursor-pointer' 
              onClick={() => setSystem(system === "classic" ? "swipe" : "classic")}
            >
              <p>
                {system === "classic" 
                  ? "Do you want to try our new system ?" 
                  : "Do you want to go back to the classic system ?"
                }
                </p>
            </div>
          )}
          

          {/* Classic System */}
          {documents.length > 0 && system === "classic" && (
            <div className={'grid grid-cols-1 sm:grid-cols-2 gap-4 text-center mt-6'}>
              {documents.map((document, index) => (
                <DocumentCard key={index} document={document}></DocumentCard>
              ))}
            </div>
          )}

          {/* Swipe System */}
          {documents.length > 0 && system === "swipe" && (
            <motion.div
              style={{ x, rotate }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.95 }}
              onDragEnd={async (event, info) => swipeDocument(event, info)}
            >
              <DocumentCard document={documents[cardIndex]}></DocumentCard>
            </motion.div>
          )}

          {(system === "swipe" ? (documents.length > 0 && cardIndex === documents.length) : documents.length > 0) && (
            <InteractiveButton>
              <button
                onClick={async () => {
                  await getDocument(true);
                }}
                className='mt-4 inline-flex items-center rounded-md border border-zinc-100 bg-foreground px-6 py-2 text-md text-background transition-all duration-300 hover:bg-gray-800 cursor-pointer'
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
