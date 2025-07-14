from fastapi import APIRouter
from sentence_transformers import SentenceTransformer

from models.document import Query

router = APIRouter(prefix="/embedding", tags=["embedding"])

@router.post("/")
async def embed_query(body: Query):
    query = [body.query]
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    embeddings = model.encode(query)[0]

    return {"embedded_message": embeddings.tolist()}
