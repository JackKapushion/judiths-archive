# AI Chat Architecture

How the AI chat feature works end to end. Covers the retrieval approach, conversation storage, streaming, and how everything connects.

## Overview

Users can ask questions about Judith's archive and get answers grounded in the actual documents. The system uses an agentic RAG approach - Claude reads a metadata index of all documents, decides which ones are relevant to the question, searches/reads those documents using tools, and synthesizes an answer with citations.

This follows the same pattern Anthropic uses in Claude Code: the model drives the retrieval decisions. The corpus is small enough (~50 documents) that Claude can reason about the entire index at once.

## Retrieval Approach: Agentic RAG

Instead of a fixed retrieval pipeline (embed query, find nearest vectors, inject chunks), we give Claude two tools and let it decide how to find information. Here's a concrete example of what happens when a user asks a question.

### Example: "What did Judith think about leadership?"

1. The user types their question and hits send. The frontend sends a POST to the `chat` Cloud Function with the message text and their auth token.

2. The Cloud Function verifies auth, creates or loads the conversation, and writes the user's message to Firestore.

3. Now it needs to call Claude. It builds the API request with three things: the conversation history (previous messages), the user's new question, and a system prompt. The system prompt contains a metadata index listing every document in the archive - just the title, category, and a short summary for each one. This is how Claude knows what documents exist.

4. Claude reads the question and scans the document index. It sees entries like "Natural Leadership: A Core Competency of Clarity" and "CHOICES: MBL Program Manual" and thinks those are probably relevant.

5. Instead of answering immediately, Claude calls `read_document("7")` to go read the CHOICES manual. The Cloud Function executes the tool, loads the document text from disk, and sends it back to Claude. The client sees a status event: "Reading document..."

6. Claude reads the document text, finds relevant passages, but wants more. It calls `search_documents("leadership transformation")` to look across the whole archive. MiniSearch runs a BM25 search with fuzzy matching and returns the top results with snippets. "Searching archive..."

7. Now Claude has enough context. It produces its final answer, citing specific documents: "In the CHOICES: MBL Program Manual, Judith describes leadership as..." The answer streams to the client token by token via SSE - the user sees it typing out in real time.

8. When the stream completes, the Cloud Function writes the full response to Firestore, updates the conversation metadata, and (if this was the first message) kicks off auto-title generation in the background.

The whole thing typically takes 2-3 tool rounds and 5-15 seconds.

### Why this approach works

- The corpus is small enough (~50 documents) that the full metadata index fits in context. Claude can reason about the whole collection at once.
- Self-contained in a single Cloud Function. No external infrastructure to manage.
- Handles both keyword queries ("CHOICES program") and conceptual queries ("What did Judith think about leadership?") because Claude understands both.
- Self-correcting. If the first search doesn't find enough, Claude tries different terms or reads related documents.
- This is the approach Anthropic uses in Claude Code and recommends for small-to-medium corpora.

### Tools

Defined in `functions/src/retrieval.ts`.

**search_documents(query, max_results?)**
Full-text search across all extracted document text using MiniSearch (BM25 scoring with fuzzy matching). Handles OCR errors and misspellings via Levenshtein distance at `fuzzy: 0.2` (~1 edit per 5 characters). Returns ranked results with document ID, title, page number, and text snippet.

**read_document(doc_id, pages?)**
Returns the extracted text from a specific document, optionally filtered to a page range. Used when Claude knows which document to look at based on the metadata index or previous search results.

### How search_documents works under the hood

When Claude calls `search_documents`, it hits a MiniSearch index built from all the extracted document text. MiniSearch is a zero-dependency, TypeScript-native library that gives us:

- BM25 scoring (same algorithm as Elasticsearch) for ranking results by relevance
- Fuzzy matching via Levenshtein distance at `fuzzy: 0.2` (~1 edit per 5 characters), which handles OCR errors like "bittemess" matching "bitterness"
- Prefix matching, so "transform" finds "transformation"

### Data files

Both live in `functions/data/` and get bundled with the Cloud Function deployment.

**document-index.json** - Metadata for every document: ID, title, summary, category, page count, filename. This is what gets embedded in the system prompt. Updated as part of Phase 2 (document review).

**search-index.json** - Extracted text from every page of every document. Keyed by filename, with an array of `{ page, text }` entries. Generated by the PDF processing pipeline in Phase 2.

## Conversation Storage

Conversations live in Firestore as a top-level collection with a messages subcollection. This follows the same model as Claude.ai (linear, no branching).

### Schema

```
conversations/{conversationId}
  userId: string              -- Firebase Auth UID (indexed)
  title: string               -- auto-generated or user-edited
  createdAt: Timestamp
  lastMessageAt: Timestamp    -- indexed, used for sidebar sorting
  messageCount: number        -- denormalized for display
  isArchived: boolean         -- indexed, filtered from sidebar

conversations/{conversationId}/messages/{messageId}
  role: "user" | "assistant"
  content: string
  status: "complete" | "streaming" | "error"
  sources: DocumentSource[]?  -- { docId, title, snippet }
  createdAt: Timestamp
```

### Why this structure

**Conversations as a top-level collection** with a `userId` field keeps security rules simple and enables collection group queries. The sidebar query is just `where userId == currentUser, orderBy lastMessageAt desc`.

**Messages as a subcollection** lets us paginate message loads and keeps real-time listeners scoped to individual messages rather than the whole conversation. It also avoids Firestore's 1 MiB document size limit, which a long conversation would hit.

**Denormalized lastMessageAt and messageCount on the conversation doc** means the sidebar never needs to read messages. One query on the conversations collection gets everything needed to render the list.

### Sidebar grouping

Conversations are grouped by time on the client side, computed from `lastMessageAt`:

- Today
- Yesterday
- Previous 7 Days
- Previous 30 Days
- Then by month ("May 2026", "April 2026", etc.)

This matches the pattern used by both ChatGPT and Claude.ai. Implemented in `src/lib/conversations.ts` via `groupConversationsByDate()`.

### Security rules

Defined in `firestore.rules`.

- Users can only read their own conversations and messages (where `userId == auth.uid`)
- Users can update `title` and `isArchived` (rename/archive from the sidebar)
- Users cannot modify `messageCount`, `lastMessageAt`, or `createdAt` - these are server-managed
- Messages have no client write rules. All messages flow through the Cloud Function using the Admin SDK

## Chat Endpoint

A single Cloud Function at `functions/src/chat.ts` handles the entire chat flow. It's an HTTP `onRequest` function (not `onCall`) because we need to stream SSE responses.

### Request

```
POST /chat
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "message": "What did Judith think about leadership?",
  "conversationId": "abc123"  // omit to start a new conversation
}
```

### Response

SSE stream (`Content-Type: text/event-stream`). Events:

| Event | When | Data |
|-------|------|------|
| `conversation_created` | New conversation started | `{ conversationId }` |
| `status` | Tool being executed | `{ text: "Searching archive..." }` |
| `content_delta` | Token generated | `{ text: "The " }` |
| `done` | Response complete | `{ messageId }` |
| `error` | Something failed | `{ error: "..." }` |

### Flow

1. Verify Firebase Auth token via `getAuth().verifyIdToken()`
2. Create or load conversation from Firestore, verify ownership
3. Write user's message to the messages subcollection
4. Load conversation history (last 50 messages, ordered by `createdAt`)
5. Build system prompt with document index, marked with `cache_control: { type: "ephemeral" }` for prompt caching
6. Enter the agentic tool-use loop (see below)
7. Write final assistant response to Firestore
8. Update conversation `lastMessageAt` and `messageCount` (atomic increment)
9. On first exchange: fire-and-forget title generation via Haiku

### Tool-use loop

```
for each round (max 5):
  stream Claude API call with system prompt + tools + message history
  forward any text deltas to client via SSE

  if stop_reason == "end_turn":
    break (final answer was streamed)

  if stop_reason == "tool_use":
    execute each tool call
    send status events to client ("Searching archive...", "Reading document...")
    append tool results to message history
    continue loop
```

The streaming works across all iterations. During retrieval rounds, any text Claude produces gets streamed to the client (it sometimes says things like "Let me look that up"). During the final round, the actual answer streams token by token.

### Configuration

| Setting | Value | Why |
|---------|-------|-----|
| `concurrency` | 1 | Each request holds an open SSE connection for the full duration |
| `maxInstances` | 10 | Limits parallel API calls and cost |
| `timeoutSeconds` | 120 | Agentic loop with multiple tool rounds can take 15-30s |
| `secrets` | `ANTHROPIC_API_KEY` | Stored as a Firebase secret, injected at runtime |

## Auto-Titling

After the first exchange in a new conversation, the chat function fires off a title generation call as a fire-and-forget async operation. This runs in parallel with the SSE `done` event being sent to the client.

Implemented in `functions/src/auto-title.ts`.

- Uses Claude Haiku (fast, cheap) to generate a 3-8 word title
- Input: the first user message and assistant response
- Writes the title back to the conversation document
- The frontend has a Firestore real-time listener on the conversation, so the sidebar title updates automatically when this completes

If title generation fails, the conversation keeps its default "New conversation" title. No retry - it's a nice-to-have, not critical.

## Prompt Caching

The system prompt includes the full document metadata index, which can be several thousand tokens. Since this is identical on every request, we mark it with `cache_control: { type: "ephemeral" }`.

- First request: Anthropic caches the system prompt (1.25x normal input cost)
- Subsequent requests: Read from cache (0.1x normal input cost - 90% savings)
- Cache TTL: 5 minutes by default
- Cache performance is logged on each request: `Cache: created=0, read=2847, input=156, output=423`

The tool definitions also count as part of the cacheable prefix. Since ours are static, they get cached alongside the system prompt.

## Cost Estimates

Per question, assuming Sonnet pricing:

| Component | Tokens | Cost |
|-----------|--------|------|
| System prompt (cached read) | ~3,000 | ~$0.001 |
| Conversation history | ~500-5,000 | ~$0.002-0.015 |
| Tool-use rounds (2-3 typical) | ~2,000-8,000 input, ~500-1,500 output | ~$0.01-0.05 |
| Final response | ~200-800 output | ~$0.003-0.012 |
| Auto-title (Haiku, first msg only) | ~500 | ~$0.0004 |
| **Total per question** | | **~$0.02-0.08** |

## Key Files

| File | What it does |
|------|-------------|
| `functions/src/index.ts` | Cloud Functions entry point, exports `chat` |
| `functions/src/chat.ts` | Chat endpoint: auth, conversation management, tool-use loop, streaming |
| `functions/src/retrieval.ts` | Tool definitions, MiniSearch engine, search/read implementations, system prompt builder |
| `functions/src/auto-title.ts` | Haiku-based conversation title generation |
| `functions/src/types.ts` | Shared TypeScript interfaces for Conversation, Message, ChatEvent |
| `functions/data/document-index.json` | Document metadata (title, summary, category per doc) |
| `functions/data/search-index.json` | Extracted text from all documents (per-page) |
| `src/lib/conversations.ts` | Frontend: Firestore queries, real-time listeners, sidebar grouping |
| `firestore.rules` | Security rules for conversations and messages |
| `firestore.indexes.json` | Composite index for sidebar query |
