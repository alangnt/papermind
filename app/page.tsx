'use client'

import { FormEvent, useEffect, useState } from 'react';
import { Document } from "@/types/documents";

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
    <div className={'flex flex-col justify-center items-center gap-y-2 grow'}>
      <form className={'space-x-2'} onSubmit={(event) => getDocument(event)}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={'border rounded-md p-2'}
        />
        <button type={'submit'} className={'border rounded-md p-2'}>Submit</button>
      </form>
      
      {documents.length > 0 && (
        <div className={'flex flex-col gap-y-2 text-center'}>
          {documents.map((document, index) => (
            <article key={index}>
              <p>{document.title}</p>
              <p>{document.summary}</p>
              <a href={document.pdfLink} className={'underline'} target={'_blank'}>Link to the PDF</a>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
