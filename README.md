# 🧠 PaperMind

> **Semantic Search & RAG for the Scientific Community.**
>
> 🚀 **[Live Demo](https://www.papermind.ch/)**

![Next.js 16](https://img.shields.io/badge/Next.js_16-Black?style=flat-square&logo=next.js&logoColor=white)
![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Vector-Green?style=flat-square&logo=mongodb&logoColor=white)
![Status](https://img.shields.io/badge/Status-Live-success?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## 💡 The Problem
Navigating the arXiv repository can be overwhelming. Traditional keyword search often misses context, making it difficult for researchers to find papers based on *concepts* rather than just titles.

## 🛠 The Solution
**PaperMind** is an intelligent research assistant that leverages **Vector Search** and **Retrieval-Augmented Generation (RAG)**. It allows users to query scientific databases using natural language, retrieving contextually relevant papers and summarizing findings instantly.

---

## ✨ Key Features

### 🔍 Semantic & Hybrid Search
Unlike standard regex matching, PaperMind uses **embedding models** to understand the intent behind your query.
* **Natural Language Queries:** Ask "How does attention mechanism work?" and get papers on Transformers.
* **Vector Search:** Powered by MongoDB Atlas Vector Search for high-dimensional similarity matching.

### 🤖 RAG-Powered Insights
* **Context-Aware Q&A:** The application retrieves relevant paper abstracts and feeds them into an LLM context window to answer specific questions with citations.
* **Blazing Fast UI:** Built on **Next.js 16 (App Router)** for server-side streaming and instant interactions.

### ⚡ Technical Highlights
* **Live arXiv Integration:** Real-time access to the latest pre-prints.
* **Self-Improving Results:** User interactions help refine the vector search relevance over time.

---

## 🏗 Architecture & Tech Stack

This project is built with performance and scalability in mind, utilizing a modern **Serverless** architecture.

| Component | Technology | Reasoning |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16** | App Router for React Server Components & SEO. |
| **Database** | **MongoDB Atlas** | Unified document store + Vector Search engine. |
| **Embeddings** | **HuggingFace** | `sentence-transformers/all-MiniLM-L6-v2` for efficient local embedding. |
| **LLM Orchestration** | **Vercel AI SDK** | Streamlined prompt engineering and streaming responses. |
| **Inference** | **Groq** | Ultra-low latency inference for the chat interface. |
| **Styling** | **Tailwind CSS** | Utility-first styling for a responsive, modern UI. |

---

## 🚀 Getting Started

To run PaperMind locally, follow these steps:

### 1. Clone the repo
```bash
git clone [https://github.com/alangeirnaert/papermind.git](https://github.com/alangeirnaert/papermind.git)
cd papermind
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Configure Environment
Create a .env.local file and add your keys:
```bash
MONGODB_URI=...
GROQ_API_KEY=...
HF_TOKEN=...
```

### 4. Run the development server
```bash
npm run dev
```
Open http://localhost:3000 to view it in the browser.

## 🗺 Roadmap

Current focus: **Performance Optimization & User Personalization.**

- [ ] 🧠 **AI Summarizer** – One-click "TL;DR" for lengthy PDFs.
- [ ] ⚡ **Backend Optimization** – Caching frequent arXiv queries to reduce API latency.
- [ ] 🌍 **Custom Domain** – Enhanced branding and SEO.

---

## 📚 Resources & Acknowledgements

- **Data Source:** [arXiv API](https://info.arxiv.org/help/api/index.html)
- **Search Engine:** [MongoDB Atlas Vector Search](https://www.mongodb.com/products/platform/atlas-vector-search)
- **Model:** [Hugging Face Transformers](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)

---

## 👨‍💻 Author

**Alan Geirnaert**
*Full-Stack Engineer & Physics Enthusiast*

- 🌐 [LinkedIn](https://www.linkedin.com/in/alan-geirnaert/)
- 🐙 [GitHub](https://github.com/alangeirnaert)
- 🚀 [Live App](https://papermind.ch/)

## 🏷 License

This project is open-source under the **MIT License**. Use it, fork it, launch your own scientific tools.

## ⭐️ Show Some Love

If you find this project useful, please give it a star ⭐ on GitHub!
