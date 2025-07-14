from fastapi import APIRouter, HTTPException
import urllib.request, urllib.parse
import xml.etree.ElementTree as ET
from sentence_transformers import SentenceTransformer

from models.document import Query
from services.mongodb import get_collection

router = APIRouter(prefix="/embed_documents", tags=["embed_documents"])

@router.post("/")
async def embed_documents(body: Query):
    collection = get_collection("documents")

    query = body.query
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    parsed_query = urllib.parse.quote_plus(query)
    url = f"http://export.arxiv.org/api/query?search_query=all:{parsed_query}&start=0&max_results=1000"
    try:
        data = urllib.request.urlopen(url)
        xml_data = data.read().decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch arXiv data: {str(e)}")

    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom', 'arxiv': 'http://arxiv.org/schemas/atom'}
    entries = root.findall('atom:entry', ns)

    if not entries:
        raise HTTPException(status_code=404, detail="No results found")

    docs_to_insert = []

    for entry in entries:
        id_ = entry.find("atom:id", ns).text.strip()
        published = entry.find("atom:published", ns).text.strip()
        updated = entry.find("atom:updated", ns)
        updated = updated.text.strip() if updated is not None else None

        # Skip if already in DB
        if collection.find_one({"id": id_}):
            continue

        title = entry.find("atom:title", ns).text.strip()
        summary = entry.find("atom:summary", ns).text.strip()
        published = entry.find("atom:published", ns).text.strip()

        # DOI
        doi_elem = entry.find("arxiv:doi", ns)
        doi = doi_elem.text.strip() if doi_elem is not None else None

        # Category
        primary_cat = entry.find("arxiv:primary_category", ns)
        category = primary_cat.attrib.get("term") if primary_cat is not None else None

        authors = [
            author.find("atom:name", ns).text.strip()
            for author in entry.findall("atom:author", ns)
        ]

        pdf_link = None
        for link in entry.findall("atom:link", ns):
            if link.attrib.get("type") == "application/pdf":
                pdf_link = link.attrib["href"]
                break

        text_to_embed = f"""Title: {title}
Authors: {', '.join(authors)}
Summary: {summary}
Category: {category or "N/A"}
Published: {published}"""

        embedding = model.encode(text_to_embed).tolist()

        docs_to_insert.append({
            "id": id_,
            "pdfLink": pdf_link,
            "text": text_to_embed.strip(),
            "embedding": embedding,
            "category": category,
            "doi": doi,
            "published": published,
            "updated": updated,
            "authors": authors,
            "summary": summary,
            "title": title,
        })

    if docs_to_insert:
        collection.insert_many(docs_to_insert)

    return {"status": 200, "inserted_documents": len(docs_to_insert)}
