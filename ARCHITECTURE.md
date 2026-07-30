# How the AI Chat Works

How the AI chat feature works from start to finish. Covers how it finds information, how conversations are stored, how answers stream in real time, and how everything connects.

## The Big Picture

Users can ask questions about Judith's archive and get answers grounded in the actual documents. The system uses agentic RAG (Retrieval-Augmented Generation), which means instead of the AI answering from memory, it actively searches the real documents to find relevant information, reads them, and writes an answer based on what it found, with citations.

Claude reads a catalog of all documents in the archive, decides which ones might answer the question, searches and reads those documents using tools, and synthesizes an answer with references. This follows the same pattern as Claude Code: the model drives the retrieval decisions itself rather than following a fixed pipeline. The archive is small enough (~85 documents) that the full catalog fits in context, so Claude can reason about the whole collection at once.

## How the AI Finds Answers

Most RAG systems use a fixed pipeline: convert the user's question into numbers, find the closest matching text chunks using math, and feed those chunks to the AI. It works, but it's rigid. The AI doesn't get to choose what to look for.

Instead, we give Claude three tools and let it decide how to find information.

### Example: "What did Judith think about leadership?"

1. The user sends a message. The browser sends it to a Cloud Function (a small server-side program hosted on Google Cloud that spins up when needed) along with the user's auth token.

2. The Cloud Function checks that the user is signed in, creates or loads the conversation, and saves the message to Firestore (Google's cloud database where all conversations live).

3. It builds a request to Claude with three things: the conversation so far, the new question, and a system prompt (background instructions the AI reads before responding). The system prompt includes a catalog listing every document in the archive with its title, category, and a short summary. This is how Claude knows what documents exist.

4. Claude reads the question and scans the document catalog. It sees entries like "Natural Leadership: A Core Competency of Clarity" and "CHOICES: MBL Program Manual" and decides those are probably relevant.

5. Instead of answering immediately, Claude calls `read_document("7")` to go read the CHOICES manual. The Cloud Function executes the tool, loads the document text from disk, and sends it back. On screen, the user sees: "Reading document..."

6. Claude reads the document, finds relevant passages, but wants more. It calls `search_documents("leadership transformation")` to search across the whole archive. The search engine scans all the documents and returns the best matches with snippets. "Searching the archive..."

7. Now Claude has enough context. It writes its answer, citing specific documents: "In the CHOICES: MBL Program Manual, Judith describes leadership as..." The answer streams to the browser word by word in real time via SSE (explained below).

8. When the stream completes, the Cloud Function saves the response to Firestore, updates conversation metadata, and (if this was the first message) generates a title for the conversation in the background using a faster, cheaper model (Claude Haiku).

Typically takes 2 to 3 rounds of searching/reading and 5 to 15 seconds.

### Why this approach works

- The archive is small enough that the full catalog fits in Claude's context window (the amount of text the AI can hold in working memory). Claude reasons about the whole collection at once.
- Self-contained in a single Cloud Function. No vector database or external search infrastructure to manage.
- Handles both keyword queries ("CHOICES program") and conceptual queries ("What did Judith think about leadership?") because Claude understands both literal text and meaning.
- Self-correcting. If the first search doesn't find enough, Claude tries different terms or reads related documents on its own.

### Tools

Defined in `functions/src/retrieval.ts`.

**search_documents** — Full-text search across all extracted document text. Uses BM25 scoring (the same core ranking algorithm behind search engines like Elasticsearch) with fuzzy matching, which means it tolerates typos and OCR errors. OCR is the process that converted scanned PDFs into searchable text, and it sometimes introduces mistakes, so a garbled word like "bittemess" will still match "bitterness." Returns ranked results with document ID, title, page number, and text snippet.

**get_document_outline** — Returns the table of contents for a document (section titles and page numbers). Lets Claude understand a document's structure before deciding which pages to read.

**read_document** — Returns the extracted text from a document, optionally filtered to a page range. Used when Claude already knows which document to look at.

### Search Engine

The search engine is a library called MiniSearch that runs inside the Cloud Function. It uses BM25 scoring for relevance ranking, fuzzy matching that tolerates about 1 typo per 5 characters, and prefix matching so "transform" also finds "transformation."

### Data Files

Two data files power the search, both bundled with the Cloud Function deployment.

**document-index.json** — Metadata for every document: ID, title, summary, category, page count, filename. This is the catalog that gets included in Claude's system prompt.

**search-index.json** — Extracted text from every page of every document. This is what the search engine scans when Claude calls `search_documents`. Generated by running OCR and text extraction on all the PDFs.

## Conversations and Streaming

Conversations are stored in Firestore with a messages subcollection (a nested list of all the back-and-forth messages inside each conversation). The chat endpoint (`functions/src/chat.ts`) verifies auth, checks rate limits, checks the monthly spending cap, runs the tool-use loop described above, and streams Claude's response back to the browser.

The streaming uses SSE (Server-Sent Events), a web standard that lets the server push data to the browser in real time. Instead of waiting for the entire answer to be generated and showing it all at once, each word appears as Claude writes it. New conversations get auto-titled in the background using Claude Haiku.

The system prompt (including the full document catalog) uses Anthropic's prompt caching. The first message in a conversation sends the full catalog to Claude, but follow-up messages within 5 minutes reuse the cached version at 1/10th the price.

## Cost

Runs on Claude Sonnet 5. Simple questions cost ~$0.07 to $0.15, multi-document questions ~$0.10 to $0.25. Cost controls: max 7 tool rounds per question, 20-message-per-hour rate limit per user, and a $100 monthly spending cap that disables chat when reached.

## Key Files

- `functions/src/chat.ts` — Chat endpoint: auth, rate limits, tool-use loop, streaming
- `functions/src/retrieval.ts` — Tool definitions, search engine, system prompt builder
- `functions/src/pricing.ts` — Pricing constants, cost computation, spending cap
- `functions/src/admin.ts` — Admin dashboard API
- `functions/data/document-index.json` — Document catalog embedded in system prompt
- `functions/data/search-index.json` — Extracted text from all documents
- `src/lib/chat-client.ts` — Frontend SSE client and streaming parser
- `firestore.rules` — Security rules
