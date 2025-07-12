import { Document } from '@/types/documents';
import Link from 'next/link';

export default function DocumentCard({ document }: { document: Document }) {
	const publishedDate = new Date(document.published).toLocaleDateString();
	
	return (
		<article className={'flex flex-col justify-between bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-5 shadow-lg hover:-translate-y-1 hover:shadow-xl transition duration-200 text-white space-y-3'}>
			<div className={'flex flex-col gap-4'}>
				<header>
					<h2 className='text-lg font-semibold'>{document.title}</h2>
					<p className='text-xs text-gray-400 mt-1'>By {document.authors.join(", ")}</p>
					<p className='text-xs text-gray-400 mt-1'>Published on {publishedDate}</p>
				</header>
				
				<p className={'text-sm text-gray-200 line-clamp-2 md:line-clamp-4'}>
					{document.summary}
				</p>
			</div>
			
			<div className='space-y-4 pt-2'>
				<div className={'flex flex-wrap gap-2'}>
					{document.pdfLink && (
						<Link
							href={document.pdfLink}
							target='_blank'
							rel='noopener noreferrer'
							className="px-3 py-1 text-sm rounded-full bg-gray-600 hover:bg-gray-500 transition"
						>
							View PDF
						</Link>
					)}
					
					{document.id && (
						<Link
							href={document.id}
							target="_blank"
							rel="noopener noreferrer"
							className="px-3 py-1 text-sm rounded-full bg-gray-600 hover:bg-gray-500 transition"
						>
							View on arXiv
						</Link>
					)}
				</div>
				
				<footer className="text-[10px] text-gray-500 pt-2 border-t border-gray-700 mt-2">
					Data sourced from <a href="https://arxiv.org" className="underline">arXiv.org</a>. Original work belongs to the respective authors.
				</footer>
			</div>
		</article>
	);
}
