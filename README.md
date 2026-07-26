# Judith's Archive

A searchable digital archive of the life's work of Judith Orloff, Ed.D., an educator, author, and consultant who spent over forty years developing programs in personal transformation, leadership development, and experiential learning. Her collection includes published works, corporate training curricula, program guides, patent filings, and unpublished manuscripts spanning topics from Kabbalistic philosophy to Fortune 500 leadership development.

The archive includes an AI chat interface that lets users ask questions about Judith's work and get answers grounded in her actual writings.

Live at [judithorloff.org](https://judithorloff.org)

## How it works

The original collection existed as paper documents in filing cabinets and boxes. The process of turning that into a searchable, AI-powered archive involved several stages:

**Document digitization and processing.** 85 documents were scanned to PDF, then run through an OCR pipeline (ocrmypdf) to add searchable text layers to scanned pages. A text extraction script (PDF.js) pulled the content from every page of every document and built a full-text search index.

**RAG (retrieval-augmented generation) architecture.** The AI chat uses an agentic retrieval pattern rather than a simple "retrieve then answer" pipeline. Claude is given three tools: `search_documents` for full-text search across the archive, `get_document_outline` for viewing a document's structure, and `read_document` for reading specific pages. Claude decides autonomously how many retrieval rounds it needs, which search terms to use, and when it has enough context to answer. The agentic loop is bounded at 5 rounds to control cost. The full system prompt (containing metadata for all 85 documents) uses Anthropic's prompt caching, reducing token costs by ~90% on repeated requests.

**Streaming responses.** Chat responses stream to the client in real time via Server-Sent Events (SSE). The Cloud Function validates the user's Firebase auth token, loads conversation history from Firestore, runs the agentic retrieval loop, and streams Claude's response token by token. Conversations are auto-titled in the background using a smaller model (Claude Haiku).

## Tech stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, react-pdf for document viewing, React Router for navigation

**Backend:** Firebase Cloud Functions (Node.js 22), Anthropic SDK for LLM calls, MiniSearch for full-text search, Firestore for conversation persistence and user data

**Infrastructure:** Firebase Hosting, Firebase Auth (Google OAuth, email link, anonymous), Firestore security rules restricting users to their own data

**Document pipeline:** ocrmypdf for OCR, Ghostscript for thumbnails, PDF.js for text extraction