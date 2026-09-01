/**
 * Client-facing document types.
 *
 * `Document` is re-exported from types/models rather than redeclared: this file
 * used to carry a copy with every field required, which arXiv does not
 * guarantee — pdfLink, doi, comment and category are all routinely absent — so
 * client code was casting its way past a type that promised more than the data
 * delivered.
 */
export type { Document } from './models';

export type SearchType = 'manual' | 'ai';
export type SystemType = 'classic' | 'swipe';
