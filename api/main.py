from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from utils import get_documents, embed_documents, vector_search

app = FastAPI()

# middleware
app.add_middleware(
	CORSMiddleware,
	allow_origins=[
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"https://astro-ai-sigma.vercel.app"
	],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

@app.get("/")
async def root():
	return {"message": "Backend is working !"}

# include all routes
app.include_router(get_documents.router)
app.include_router(embed_documents.router)
app.include_router(vector_search.router)

if __name__ == "__main__":
	import uvicorn
	uvicorn.run(app, host="0.0.0.0", port=8000)
