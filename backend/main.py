from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import get_documents

app = FastAPI()

# middleware
app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:3000"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

@app.get("/")
async def root():
	return {"message": "Backend is working !"}

# include all routes
app.include_router(get_documents.router)
