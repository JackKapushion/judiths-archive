# Softas Site

Memorial/archive website for Judith Orloff's personal transformation and leadership work. Custom-built RAG (Retrieval-Augmented Generation) system that lets visitors search and chat about 75+ digitized PDF documents using Claude. Built for her family. Live at https://judithorloff.org.

## Tech Stack

Frontend: React 19, TypeScript, Vite (bundler), Tailwind CSS 4. Routing: React Router v7.
Backend: Firebase Cloud Functions (chat/search logic, Claude API calls). Database: Firestore (conversations, rate limits, spending).
AI: Anthropic Claude Sonnet (agentic tool-use with retrieval). Search: MiniSearch (BM25 + fuzzy matching for OCR tolerance).
Hosting: Firebase Hosting (static CDN). Auth: Firebase Auth (Google/email + anonymous support).

## Folder Structure

- `src/App.tsx`: main router
- `src/pages/home.tsx`: homepage (hero + document library grid)
- `src/pages/chat.tsx`: chat interface with SSE streaming
- `src/pages/viewer.tsx`: PDF viewer with outline and citation highlighting
- `src/pages/admin.tsx`: admin dashboard (auth-gated)
- `src/lib/chat-client.ts`: SSE streaming client
- `src/lib/documents.ts`: all 75 document metadata (large file, ~92KB)
- `src/lib/citation-parser.ts`: highlights citations in PDF viewer
- `functions/src/chat.ts`: main chat endpoint (auth, rate limits, tool-use loop, streaming)
- `functions/src/retrieval.ts`: tool definitions (search_documents, read_document, get_document_outline)
- `functions/src/admin.ts`: admin API (document stats, spending)
- `functions/src/pricing.ts`: cost computation and spending cap logic
- `functions/data/`: document index, reviews, and search index JSON files
- `public/documents/`: 75 PDF files
- `public/text-positions/`: per-document text bounding box coordinates (for citation highlighting)
- `scripts/`: Node.js ESM scripts for PDF processing (edit, OCR, extract text/positions, verify outlines)

## Running

Dev: `npm run dev`
Build: `npm run build`
Deploy frontend: `npm run build && firebase deploy --only hosting`
Deploy functions: `cd functions && npm run build && cd .. && firebase deploy --only functions`
Deploy everything: `npm run build && cd functions && npm run build && cd .. && firebase deploy`

## Chat Architecture

Client sends message -> Cloud Function verifies auth and rate limits -> Claude enters tool-use loop (search documents, read content, get outlines) -> SSE stream response back to browser -> save conversation to Firestore.

Claude gets a catalog of all 75 documents in its system prompt. It decides which ones to read/search via tool calls.

## Key Patterns

- **Streaming**: SSE (Server-Sent Events) for real-time response display
- **Search**: full-text BM25 + fuzzy matching (tolerates OCR typos), ranked results with snippets
- **State**: React hooks + Firestore listeners for conversations
- **Security**: Firebase Auth, Firestore rules restrict user access, rate limits + spending cap + monthly cap + org limit (multiple safety layers)
- **Responsive**: Tailwind responsive (base = mobile, `sm:` = desktop)
- **Spacing**: 8px grid (Tailwind's spacing scale). All spacing in multiples of 4 or 8.

## Code Comments

When writing or modifying code, always add comments explaining **why** something is done the way it is. Don't just describe what the code does. Explain the reasoning, tradeoffs, and constraints.

Good: `// Using proximity (not mandatory) so scroll-snap only activates near snap points, allowing free scrolling through the library`
Bad: `// Set scroll snap type`

## Mobile Design Rules

Desktop was designed first. Mobile changes must never break desktop. All mobile-specific styles use Tailwind responsive prefixes (base = mobile, `sm:` = desktop).

- Header: always sticky with painted watercolor effect. iOS Safari doesn't support per-axis `overflow-x: clip` correctly, so painted-header CSS uses a media query workaround.
- Hero: `min-h-[100dvh]` (not fixed height) so content can overflow on short screens. No snap scroll on mobile (desktop only). Full-width watercolor on mobile (`px-0`).
- Typography: body text `text-lg` (18px) minimum on both mobile/desktop. Headings scale down on mobile.
- Icons: use `-mt-1` on desktop, `-mt-1.5` on mobile for optical alignment with text.
- The painted watercolor textures have irregular feathered edges. Content must sit inside the visible paint area, not just inside the div's bounding box.
- Always test that desktop is unchanged after mobile work.

## iOS Safari Gotcha

Never use the `scale` filter on iOS Simulator screen recordings. The color range metadata is misinterpreted, producing washed-out output. Re-encode at original resolution instead.
