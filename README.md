# 🧠 PaperMind

> **AI-assisted discovery for scientific papers.**
>
> 🚀 **[Live Demo](https://www.papermind.ch/)**

![Next.js 16](https://img.shields.io/badge/Next.js_16-Black?style=flat-square&logo=next.js&logoColor=white)
![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-Green?style=flat-square&logo=mongodb&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-F55036?style=flat-square&logo=groq&logoColor=white)
![Status](https://img.shields.io/badge/Status-Live-success?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## 💡 The Problem

Searching arXiv means knowing the right keywords. Ask it a real question — _"how do transformers actually handle long context?"_ — and keyword matching gives you nothing useful. Researchers think in concepts; the search box wants terms.

## 🛠 The Solution

**PaperMind** puts a language model between your question and the search index. You ask in plain English, an LLM distils it into the terminology the archive expects, and you get papers back — no query-crafting required.

---

## ✨ Features

### 🔍 Ask in plain English

Type a question, not keywords. A Groq-hosted model condenses it into a precise search phrase before the query reaches arXiv.

> _"What are the latest breakthroughs in quantum computing?"_ → `quantum computing breakthroughs`

If the model is unavailable, the search falls back to your raw query rather than failing.

### 📚 Two ways to read

- **Classic** — a paginated grid of paper cards with expandable abstracts.
- **Swipe** — one card at a time, drag to move through the deck. Reaching the end loads more.

Every card links to the PDF and the arXiv abstract page.

### 🔐 Accounts and saved papers

Sign up to bookmark papers to your profile. Auth is a hand-rolled JWT setup in `HttpOnly` cookies with bcrypt hashing, silent token refresh, per-IP rate limiting, account lockout after repeated failures, and Postmark-delivered password resets.

---

## 🏗 Tech Stack

| Component        | Technology                   | Why                                              |
| :--------------- | :--------------------------- | :----------------------------------------------- |
| **Framework**    | Next.js 16 (App Router)      | Route handlers + React 19, deployed serverless   |
| **Database**     | MongoDB Atlas                | Document store for users and saved papers        |
| **LLM**          | Groq (`openai/gpt-oss-120b`) | Sub-second keyword extraction                    |
| **LLM plumbing** | Vercel AI SDK                | Thin, provider-agnostic wrapper                  |
| **Papers**       | arXiv API                    | Live access to pre-prints                        |
| **Auth**         | `jsonwebtoken` + `bcryptjs`  | Cookie-based sessions, no third-party dependency |
| **Email**        | Postmark                     | Password-reset delivery                          |
| **Styling**      | Tailwind CSS v4 + Motion     | Utility-first CSS, spring animations             |

---

## 🚀 Getting Started

### 1. Clone and install

This project uses [Bun](https://bun.sh).

```bash
git clone https://github.com/alangnt/papermind.git
cd papermind
bun install
```

### 2. Configure the environment

Create `.env.local`:

```bash
# Required
MONGODB_URI=                    # MongoDB Atlas connection string
MONGODB_NAME=                   # database name, e.g. Astra
SECRET_KEY=                     # signing key for access tokens

# Recommended
GROQ_API_KEY=                   # without it, search uses your raw query verbatim
POSTMARK_SERVER_TOKEN=          # without it, password reset returns 500
WEBSITE_URL=                    # absolute URL used in reset emails (default: http://localhost:3000)
REFRESH_SECRET_KEY=             # separate key for refresh tokens (default: SECRET_KEY)

# Optional — sensible defaults exist
ALGORITHM=HS256
REFRESH_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_MINUTES=43200
```

> **Note:** `MONGODB_NAME` has no default. A fallback would let a misconfigured deployment silently read and write the wrong database, so the app throws instead.

### 3. Create the database indexes

Unique indexes on `users.username` and `users.email` are what actually prevent duplicate accounts — without them, concurrent sign-ups race. Check first, then apply:

```bash
bun run db:indexes:check   # dry run, writes nothing
bun run db:indexes         # creates them; refuses if duplicates already exist
```

### 4. Run it

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📜 Scripts

| Script               | Purpose                                          |
| :------------------- | :----------------------------------------------- |
| `bun run dev`        | Dev server with Turbopack                        |
| `bun run build`      | Production build                                 |
| `bun run lint`       | ESLint — fails on any warning                    |
| `bun run lint:fix`   | ESLint with autofix                              |
| `bun run format`     | Prettier across the repo                         |
| `bun run knip`       | Report unused files, exports and dependencies    |
| `bun run db:indexes` | Create the required MongoDB indexes (idempotent) |

A husky `pre-commit` hook runs `lint` and blocks the commit on any finding.

---

## 🗺 Roadmap

**Semantic vector search** is the headline goal and is _not_ implemented yet. `/api/vector_search` and `/api/embed_documents` exist as stubs that return `501`, with the intended MongoDB `$vectorSearch` aggregation preserved in comments. Finishing it needs an embedding model wired in — either `@xenova/transformers` in-process or a hosted embeddings API.

- [ ] 🧠 **Vector search** — embed abstracts, retrieve by concept similarity
- [ ] 💬 **RAG answers** — synthesise a cited answer from retrieved abstracts
- [ ] ⚡ **Query caching** — cache arXiv responses to cut latency and API load
- [ ] 📊 **Distributed rate limiting** — the current limiter is in-memory, so limits reset on cold start and are per-instance
- [ ] ✉️ **Email verification** — accounts are currently auto-verified on sign-up
- [ ] 🧪 **Test suite** — there is none today

---

## 📚 Resources

- **Data source:** [arXiv API](https://info.arxiv.org/help/api/index.html)
- **Inference:** [Groq](https://groq.com/)
- **LLM SDK:** [Vercel AI SDK](https://ai-sdk.dev/)

Thank you to arXiv for use of its open access interoperability.

---

## 📄 License

[MIT](LICENSE)
