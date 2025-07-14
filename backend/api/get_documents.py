from fastapi import APIRouter, HTTPException
import urllib.request, urllib.parse
import xml.etree.ElementTree as ET

from models.document import Document, Query

router = APIRouter(prefix="/get_documents", tags=["get_documents"])

@router.post("/")
async def ask_query(body: Query):
    try:
        limit = 5 * body.page

        # Step 1: Get XML
        query = urllib.parse.quote_plus(body.query)
        url = f"http://export.arxiv.org/api/query?search_query=all:{query}&start=0&max_results={limit}"
        data = urllib.request.urlopen(url)
        xml_data = data.read().decode('utf-8')

        # Step 2: Parse XML with namespace
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom', 'arxiv': 'http://arxiv.org/schemas/atom'}

        # Step 3: Extract entries
        entries = root.findall('atom:entry', ns)
        if not entries:
            raise HTTPException(status_code=404, detail="No results found")

        documents = []

        for entry in entries:
            title = entry.find("atom:title", ns).text.strip()
            summary = entry.find("atom:summary", ns).text.strip()
            id_ = entry.find("atom:id", ns).text.strip()
            published = entry.find("atom:published", ns).text.strip()
            updated = entry.find("atom:updated", ns)
            updated = updated.text.strip() if updated is not None else None

            # Authors
            authors = [
                author.find("atom:name", ns).text.strip()
                for author in entry.findall("atom:author", ns)
            ]

            # PDF link
            pdf_link = None
            for link in entry.findall("atom:link", ns):
                if link.attrib.get("type") == "application/pdf":
                    pdf_link = link.attrib["href"]
                    break

            # Comment
            comment_elem = entry.find("arxiv:comment", ns)
            comment = comment_elem.text.strip() if comment_elem is not None else None

            # DOI
            doi_elem = entry.find("arxiv:doi", ns)
            doi = doi_elem.text.strip() if doi_elem is not None else None

            # Category
            primary_cat = entry.find("arxiv:primary_category", ns)
            category = primary_cat.attrib.get("term") if primary_cat is not None else None

            documents.append(Document(
                id=id_,
                title=title,
                summary=summary,
                authors=authors,
                published=published,
                updated=updated,
                pdfLink=pdf_link,
                comment=comment,
                doi=doi,
                category=category
            ))

        return {"documents": documents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
