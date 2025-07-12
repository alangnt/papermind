'use client'

import { FormEvent, useState } from 'react';
import { Document } from '@/types/documents';
import DocumentCard from '@/components/cards/DocumentCard';
import StarfieldBackground from '@/components/Starfield';

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
    <div className={'flex flex-col justify-center items-center gap-y-2 grow py-4 px-4 lg:px-0 w-full max-w-screen-md place-self-center'}>
      <StarfieldBackground></StarfieldBackground>
      
      <form
        className={'flex flex-col gap-6 w-full bg-foreground text-gray-300 p-4 border border-gray-400 rounded-xl'}
        onSubmit={(event) => getDocument(event)}
      >
        <input
          type="text"
          value={query}
          autoFocus={true}
          placeholder={'I\'m looking for...'}
          onChange={(e) => setQuery(e.target.value)}
          className={'text-sm w-full focus:outline-none focus:ring-O focus:border-transparent'}
        />
        
        <p className={'text-xs text-center'}>Enter any scientific question and get a sample of research papers to work on.</p>
      </form>
      
      {documents.length > 0 && (
        <div className={'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-center'}>
          {documents.map((document, index) => (
            <DocumentCard key={index} document={document}></DocumentCard>
          ))}
        </div>
      )}
    </div>
  )
}
