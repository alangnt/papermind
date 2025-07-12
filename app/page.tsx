'use client'

import { FormEvent, useEffect, useState } from 'react';
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
    console.log(aiResponse);
    
    if (aiResponse.status !== 200) return setDocuments([]);
    
    const response = await fetch(`/api/getDocuments?query=${encodeURIComponent(aiResponse.content)}`);
    const results = await response.json();
    
    console.log(results);
    setDocuments(results);
  };
  
  useEffect(() => {
    console.log(documents);
  }, [documents]);
  
  return (
    <div className={'flex flex-col justify-center items-center gap-y-2 grow p-4 lg:p-0 w-full max-w-screen-md place-self-center'}>
      <StarfieldBackground></StarfieldBackground>
      <form className={'flex gap-x-2 w-full'} onSubmit={(event) => getDocument(event)}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={'border rounded-md py-1 px-2 text-sm w-full'}
        />
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
