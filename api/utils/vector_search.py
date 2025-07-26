from fastapi import HTTPException, APIRouter
from sentence_transformers import SentenceTransformer

from document import Query
from mongodb import get_collection

router = APIRouter(prefix="/vector_search", tags=["vector_search"])

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

@router.post("/")
async def vector_search(body: Query):
    collection = get_collection("documents")

    query = body.query
    query_vector = model.encode(query).tolist()

    try:
        results = collection.aggregate([
            {
                "$vectorSearch": {
                    "index": "search_similar",
                    "path": "embedding",
                    "queryVector": query_vector,
                    "numCandidates": 200,
                    "limit": 10
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "id": 1,
                    "pdfLink": 1,
                    "title": 1,
                    "summary": 1,
                    "authors": 1,
                    "published": 1,
                    "score": { "$meta": "vectorSearchScore" }
                }
            }
        ])


    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mongo vector search failed: {str(e)}")

    return {"documents": list(results)}
