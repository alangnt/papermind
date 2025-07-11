import { NextRequest, NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';
import { XMLFile, Document } from '@/types/documents';

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const query = searchParams.get('query');
	
	if (!query) {
		return NextResponse.json(JSON.stringify({ error: 'Missing "query" parameter' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	
	const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=5`;
	
	try {
		const data = await fetch(url);
		const xml = await data.text();
		
		const result = await parseStringPromise(xml, {
			ignoreAttrs: false,
			mergeAttrs: true,
			explicitArray: false,
			tagNameProcessors: [name => name.replace(/^.*:/, '')], // Remove namespaces
		});
		
		let entries = result.feed.entry;
		
		if (!entries) {
			return NextResponse.json(JSON.stringify({ error: 'No results found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		
		// Ensure entries is an array
		if (!Array.isArray(entries)) {
			entries = [entries];
		}
		
		const documents: XMLFile[] = entries.map((entry: XMLFile) => ({
			title: entry.title,
			summary: entry.summary,
			authors: Array.isArray(entry.author)
				? entry.author.map((a: { name: string }) => a.name)
				: [entry.author.name],
			published: entry.published,
			updated: entry.updated,
			pdfLink: Array.isArray(entry.link)
				? entry.link.find((l: { type?: string }) => l.type === 'application/pdf')?.href
				: entry.link?.href,
			comment: entry.comment,
			doi: entry.doi,
			id: entry.id,
			category: entry.primary_category?.term || entry.category?.term,
		} as Document));
		
		return NextResponse.json(documents, {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (e) {
		return NextResponse.json(JSON.stringify({ error: 'Failed to fetch or parse XML', details: String(e) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
