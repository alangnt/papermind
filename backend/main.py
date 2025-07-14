from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from api import get_documents, embedding

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
app.include_router(embedding.router)

if __name__ == "__main__":
	uvicorn.run("main:app", host="0.0.0.0", port=8080)
