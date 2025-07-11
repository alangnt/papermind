import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	const apiKey = process.env.GROQ_API_KEY || '';
	if (!apiKey.length) return NextResponse.json({ message: 'No API key found.', status: 404 });
	
	try {
		const data = await request.json();
		
		if (!data.query) return NextResponse.json(JSON.stringify({ error: 'No query found' }), { status: 404 });
		
		const { text } = await generateText({
			model: groq('llama-3.3-70b-versatile'),
			prompt: `You are a science research archivist. Based on the following query,
			analyze and return a keyword to summarize the request that could be used as an index to find papers, do not explain anything, only return the keyword:
			${data.query}`,
		});
		
		const thinkBlockRegex = /<think>[\s\S]*?<\/think>/;
		const finalMessage = text.replace(thinkBlockRegex, '').trim();
		
		return NextResponse.json({ content: finalMessage as string, status: 200 });
	} catch (error) {
		return NextResponse.json(JSON.stringify({ error: error }), { status: 500 });
	}
}
