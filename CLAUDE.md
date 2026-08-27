# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **bun** (`bun.lock` is committed); npm scripts work equally.

```bash
bun install
bun run dev      # next dev --turbopack, http://localhost:3000
bun run build
bun run format   # prettier --write .
bun run knip     # dead-code / unused-dependency check
bun run test     # placeholder: echoes "No tests yet" and exits 0
```

There is **no test framework yet** — `bun run test` is a stub, and the husky `pre-commit` hook just runs it. Manual auth smoke test: `./test-cookies.sh` (curls sign-in → `/api/users/me` against a running dev server with a `testuser` account).

Requires `.env.local` with: `WEBSITE_URL`, `MONGODB_URI`, `MONGODB_NAME`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_SECRET_KEY`, `REFRESH_ALGORITHM`, `REFRESH_TOKEN_EXPIRE_MINUTES`, `POSTMARK_SERVER_TOKEN`, `GROQ_API_KEY`.

## Architecture

Next.js 16 App Router, React 19, Tailwind v4 (CSS-first via `@tailwindcss/postcss`, no `tailwind.config`), MongoDB driver directly (no ORM). Path alias `@/*` → repo root. shadcn/new-york conventions are configured in [components.json](components.json) but components here are hand-written.

The UI is essentially **one client component**: [app/page.tsx](app/page.tsx) holds all search state, both display modes (`SystemType`: `'classic'` list vs `'swipe'` deck driven by `motion`), auth panel visibility, and pagination. [app/profile/page.tsx](app/profile/page.tsx) manages saved articles. Server Components are barely used — treat `app/page.tsx` as the app's state machine.

### Search flow

A search is two hops, both from the client:
1. `POST /api/askAi` — Groq (`openai/gpt-oss-120b` via Vercel AI SDK `generateText`) distills the natural-language query into a ≤3-word keyword.
2. `POST /api/get_documents` — that keyword goes to the arXiv Atom API via [lib/arxiv.ts](lib/arxiv.ts) (xml2js parsing), rate-limited per IP.

**Vector search is not implemented.** [app/api/vector_search/route.ts](app/api/vector_search/route.ts) and [app/api/embed_documents/route.ts](app/api/embed_documents/route.ts) both return 501 with the intended MongoDB `$vectorSearch` aggregation preserved in comments. The README's claims about embeddings/RAG describe the target state, not the current code.

### Auth

Custom JWT + cookie auth, no auth library:
- [lib/auth.ts](lib/auth.ts) — bcrypt hashing, access/refresh token signing & verification. Tokens carry `{ sub: username, type: 'access' | 'refresh' }`; the `type` claim is checked on verify so tokens aren't interchangeable. `sub` is the **username**, not the `_id`.
- [lib/cookies.ts](lib/cookies.ts) — `httpOnly` cookies `access_token` (30 min) / `refresh_token` (30 days), `SameSite=Lax`, `Secure` only in production.
- [lib/middleware.ts](lib/middleware.ts) — `withAuth(handler)` HOF wrapping route exports; reads the cookie (falling back to `Authorization: Bearer`), verifies, loads the `User` from Mongo, and passes it as `context.user`. **Not** Next.js middleware despite the filename.
- [proxy.ts](proxy.ts) — this *is* the Next.js middleware (renamed to `proxy.ts` in Next 16). Sets CSP and security headers only; no auth logic.
- [lib/api.ts](lib/api.ts) — client-side `apiFetch`: always `credentials: 'include'`, and on a 401 does a single de-duplicated `POST /api/auth/refresh` then retries. Client code should use `apiFetch`, not bare `fetch`, for anything authenticated.

Password reset writes a token doc to the `reset_tokens` collection and mails the link via Postmark.

### MongoDB

[lib/mongodb.ts](lib/mongodb.ts) exposes only `getCollection<T>(name, dbName?)`. The client promise is cached on `globalThis` in development to survive HMR. Note the default database name is hardcoded to `'Astra'` (the `MONGODB_NAME` env var is not read by this module). Collections in use: `users`, `reset_tokens`, `documents` (documents only in the disabled embedding routes). Saved articles are embedded in the user document as `saved_articles`, rewritten wholesale on save/delete.

### Types caveat

Two overlapping document/user type sets exist and both are imported in different places: [types/models.ts](types/models.ts) (server-side, mostly-optional fields, `_id: string | ObjectId`) and [types/documents.d.ts](types/documents.d.ts) + [types/users.d.ts](types/users.d.ts) (client-side, all-required fields). Match whichever the surrounding file already uses rather than unifying them incidentally.

### Rate limiting

[lib/ratelimit.ts](lib/ratelimit.ts) is a single in-process `Map` with a sliding window and per-operation helpers (`checkSignInRateLimit`, `checkSearchRateLimit`, …). It does not survive restarts and is per-instance, so it provides no guarantee on serverless/multi-instance deploys.

## Conventions

Prettier config: single quotes, semicolons, `printWidth: 100`, 2-space tabs. Run `bun run format` before committing — files under `app/api/` and `lib/` are visibly not yet formatted to it, so limit reformatting to files you're already touching.

Route handlers consistently wrap bodies in try/catch, `console.error` the failure, and return `NextResponse.json({ error }, { status })` — mirror that shape. Error messages for auth are deliberately generic ("Incorrect username or password") and sign-in hashes a dummy password for unknown users to keep timing constant; preserve both.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
