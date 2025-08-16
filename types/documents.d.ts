export type Document = {
	title: string;
	summary: string;
	authors: string[];
	published: string;
	updated: string;
	pdfLink: string;
	comment: string;
	doi: string;
	id: string;
	category: string;
};

export type SearchType = "manual" | "ai";
export type SystemType = "classic" | "swipe"
