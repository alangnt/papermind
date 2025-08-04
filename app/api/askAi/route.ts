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
			prompt: `You are a scientific research archivist AI.

Given the user's query below, return a concise and precise keyword or short keyphrase (maximum 3 words) suitable for indexing academic papers.

Instructions:
- Return only the keyword or keyphrase.
- Do not add any explanation, formatting, or punctuation.
- Use only lowercase letters with no accents or special characters.
- Make it as specific as possible without being too long.

User query:
${data.query}
`,
		});
		
		const thinkBlockRegex = /<think>[\s\S]*?<\/think>/;
		const finalMessage = text.replace(thinkBlockRegex, '').trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
		
		return NextResponse.json({ content: finalMessage as string }, { status: 200 });
	} catch (error) {
		return NextResponse.json(JSON.stringify({ error: error }), { status: 500 });
	}
}
