export type XMLFile = {
	title: string;
	summary: string;
	author: { name: string } | { name: string }[];
	published: string;
	updated: string;
	link?: { href: string };
	comment: string;
	doi: string;
	id: string;
	primary_category?: { term: string };
	category?: { term: string };
}

export type Document = {
	title: string;
	summary: string;
	authors: string | string[];
	published: string;
	updated: string;
	pdfLink: string;
	comment: string;
	doi: string;
	id: string;
	category: string;
}
