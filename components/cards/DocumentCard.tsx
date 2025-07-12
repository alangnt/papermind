import { Document } from "@/types/documents";
import { MouseEvent, useState } from 'react';

export default function DocumentCard({ document }: { document: Document }) {
	const [seeMore, setSeeMore] = useState<boolean>(false);
	
	const preventLinkRedirect = (e: MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		e.preventDefault();
	}
	
	const navigateToPDF = () => {
		window.open(document.pdfLink, '_blank');
	}
	
	const buttonsList = [
		{ name: seeMore ? 'See less' : 'See more', action: (e: MouseEvent<HTMLButtonElement>) => { preventLinkRedirect(e); setSeeMore(!seeMore); } },
		{ name: 'See PDF', action: (e: MouseEvent<HTMLButtonElement>) => { preventLinkRedirect(e); navigateToPDF(); } },
		{ name: 'Summarize PDF', action: (e: MouseEvent<HTMLButtonElement>) => { preventLinkRedirect(e); } }
	];
	
	return (
		<article className={'flex flex-col justify-between gap-4 border p-4 bg-gray-300 rounded-lg hover:-translate-x-0.5 hover:-translate-y-0.5 duration-150 transition-transform grid-cols-1 shadow-lg'}>
			<div className={'space-y-2'}>
				<p className={'font-semibold'}>{document.title}</p>
				<p className={`text-sm ${seeMore ? '' : 'line-clamp-2 md:line-clamp-4'}`}>{document.summary}</p>
			</div>
			
			<div className={'flex flex-wrap items-center justify-center gap-2 mt-2'}>
				{buttonsList.map((buttonItem, index) => (
					<button
						key={index}
						onClick={buttonItem.action}
						className={'p-2 rounded-xl bg-foreground text-background cursor-pointer hover:bg-gray-700 duration-150 transition-all text-sm'}
					>{buttonItem.name}</button>
				))}
			</div>
		</article>
	)
}
