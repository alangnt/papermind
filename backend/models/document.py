from pydantic import BaseModel
from typing import Optional, List

class Document(BaseModel):
    id: str
    title: str
    summary: str
    authors: List[str]
    published: str
    updated: Optional[str] = None
    pdfLink: Optional[str] = None
    comment: Optional[str] = None
    doi: Optional[str] = None
    category: Optional[str] = None

class Query(BaseModel):
    query: str
    page: int = 1
