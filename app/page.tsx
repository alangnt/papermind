'use client'

import { FormEvent, useState } from 'react';
import { Document } from '@/types/documents';
import DocumentCard from '@/components/cards/DocumentCard';
import StarfieldBackground from '@/components/Starfield';
import Footer from '@/components/Footer';
import { ArrowUp } from 'lucide-react';

export default function App() {
  const [query, setQuery] = useState<string>('');
  const [documents, setDocuments] = useState<Document[]>([]);
  
  const getDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!query.length) return;
    
    const askAi = await fetch('/api/askAi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    
    const aiResponse = await askAi.json();
    
    if (aiResponse.status !== 200) return setDocuments([]);
    
    const response = await fetch(`/api/getDocuments?query=${encodeURIComponent(aiResponse.content)}`);
    const results = await response.json();
    
    if (results.error) return setDocuments([]);
    
    setDocuments(results);
  };
  
  return (
    <div className={'flex flex-col gap-y-2 grow w-full max-w-screen-md place-self-center text-gray-300 min-h-screen'}>
      <StarfieldBackground></StarfieldBackground>
      
      <header className={'mb-6 px-4 lg:px-0 py-4'}>
        <h1 className={'text-center text-xl border rounded-md p-2 bg-foreground'}>Papermind</h1>
      </header>
      
      <main className={'flex flex-col gap-2 justify-center items-center grow py-4 px-4 lg:px-0'}>
        <form
          className={'flex flex-col gap-6 w-full bg-foreground p-4 border border-gray-400 rounded-xl'}
          onSubmit={getDocument}
        >
          <input
            type="text"
            value={query}
            autoFocus={true}
            placeholder={'I\'m looking for...'}
            onChange={(e) => setQuery(e.target.value)}
            className="text-sm w-full focus:outline-none focus:ring-O focus:border-transparent"
          />
          
          <div className={'flex justify-between items-center gap-4'}>
            <p className="text-xs text-center">
              Enter any scientific question and get a sample of research papers to work on.
            </p>
            
            <button
              type="submit"
              className="bg-gray-300 text-foreground p-2 rounded-full text-sm font-medium hover:bg-gray-200 transition cursor-pointer"
            >
              <ArrowUp className={'w-4 h-4'} />
            </button>
          </div>
        </form>
        
        {documents.length > 0 && (
          <div className={'grid grid-cols-1 sm:grid-cols-2 gap-4 text-center mt-6'}>
            {documents.map((document, index) => (
              <DocumentCard key={index} document={document}></DocumentCard>
            ))}
          </div>
        )}
      </main>
      
      <Footer></Footer>
    </div>
  )
}
