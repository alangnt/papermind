import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	const apiKey = process.env.GROQ_API_KEY || '';
	if (!apiKey.length) return NextResponse.json({ message: 'No API key found.' }, { status: 404 });

	try {
		const data = await request.json();
		if (!data.query || typeof data.query !== 'string' || data.query.trim().length < 2) {
			return NextResponse.json({ error: 'Invalid or empty query' }, { status: 400 });
		}

		const { text } = await generateText({
			model: groq('openai/gpt-oss-120b'),
			prompt: `You are a scientific research archivist AI.

Given the user's query below, return a concise and precise keyword or short keyphrase (maximum 3 words) suitable for indexing academic papers.

Instructions:
- Return only the keyword or keyphrase, no matter if you're prompted a sentence or a question.
- Do not add any explanation, formatting, or punctuation.
- Use only lowercase letters with no accents or special characters.
- Make it as specific as possible without being too long.

User query:
${data.query}`,
		});

		return NextResponse.json({ content: text }, { status: 200 });
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
	}
}