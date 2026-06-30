import * as fs from 'fs'
import * as path from 'path'
import MiniSearch from 'minisearch'
import type Anthropic from '@anthropic-ai/sdk'

// --- Types ---

export interface DocumentMeta {
  id: string
  title: string
  summary: string
  category: string
  pageCount: number
  filename: string
}

interface SearchIndexEntry {
  pages: { page: number; text: string }[]
}

type RawSearchIndex = Record<string, SearchIndexEntry>

// Each page of each document becomes a searchable record
interface SearchRecord {
  uid: string // unique key: "docId:page"
  docId: string
  title: string
  page: number
  text: string
}

// --- Data loading ---

let documentIndex: DocumentMeta[] | null = null
let miniSearch: MiniSearch<SearchRecord> | null = null

function getDocumentIndex(): DocumentMeta[] {
  if (!documentIndex) {
    const filePath = path.join(__dirname, '..', 'data', 'document-index.json')
    documentIndex = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  }
  return documentIndex!
}

function getSearchEngine(): MiniSearch<SearchRecord> {
  if (miniSearch) return miniSearch

  const docs = getDocumentIndex()
  const rawIndex: RawSearchIndex = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'data', 'search-index.json'), 'utf-8'),
  )

  // Build searchable records from every page of every document
  const records: SearchRecord[] = []
  for (const doc of docs) {
    const entry = rawIndex[doc.filename]
    if (!entry) continue

    for (const page of entry.pages) {
      records.push({
        uid: `${doc.id}:${page.page}`,
        docId: doc.id,
        title: doc.title,
        page: page.page,
        text: page.text,
      })
    }
  }

  miniSearch = new MiniSearch<SearchRecord>({
    idField: 'uid',
    fields: ['text', 'title'],
    storeFields: ['docId', 'title', 'page', 'text'],
    searchOptions: {
      boost: { title: 2 },
      fuzzy: 0.2, // allow ~1 edit per 5 characters (handles OCR errors)
      prefix: true, // match word prefixes
    },
  })

  miniSearch.addAll(records)
  return miniSearch
}

// --- Tool definitions for Claude API ---

export const tools: Anthropic.Messages.Tool[] = [
  {
    name: 'search_documents',
    description:
      'Search the full text of all documents in the archive for passages matching a query. ' +
      'Uses fuzzy matching, so it will find results even with slight misspellings or OCR errors. ' +
      'Returns the most relevant passages ranked by BM25 relevance scoring. ' +
      'Use this when you need to find specific quotes, passages, or information across the archive. ' +
      'Prefer specific search terms over broad queries. Multiple short searches are better than one broad search.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description:
            'Search query. Use key terms from the user\'s question. ' +
            'For quotes, use the most distinctive words from the quote.',
        },
        max_results: {
          type: 'number',
          description:
            'Maximum results to return (default 5). Use fewer for targeted lookups, more for broad topic searches.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_document',
    description:
      'Read the extracted text of a specific document from the archive. ' +
      'Use this after identifying a relevant document from the document index or search results. ' +
      'For large documents, specify a page range to read a section at a time.',
    input_schema: {
      type: 'object' as const,
      properties: {
        doc_id: {
          type: 'string',
          description: 'The document ID (e.g., "3a", "4b", "7")',
        },
        pages: {
          type: 'string',
          description:
            'Optional page range to read (e.g., "1-5", "10-20"). Omit to read the full document.',
        },
      },
      required: ['doc_id'],
    },
  },
]

// --- Tool execution ---

// Returns content blocks suitable for a tool_result message.
// search_documents returns search_result blocks for automatic citation tracking.
// read_document returns text blocks.
export function executeToolCall(
  name: string,
  input: Record<string, unknown>,
): Anthropic.Messages.ToolResultBlockParam['content'] {
  switch (name) {
    case 'search_documents':
      return searchDocuments(
        input.query as string,
        (input.max_results as number | undefined) ?? 5,
      )
    case 'read_document':
      return readDocument(input.doc_id as string, input.pages as string | undefined)
    default:
      return [{ type: 'text', text: `Unknown tool: ${name}` }]
  }
}

// --- Search implementation ---

function searchDocuments(
  query: string,
  maxResults: number,
): Anthropic.Messages.ToolResultBlockParam['content'] {
  const engine = getSearchEngine()
  const results = engine.search(query, { fuzzy: 0.2, prefix: true })

  if (results.length === 0) {
    return [
      {
        type: 'text',
        text: `No results found for "${query}". Try different search terms or check the document index for relevant documents to read directly.`,
      },
    ]
  }

  // Deduplicate: if multiple pages from the same doc match, keep the best one
  const seen = new Map<string, (typeof results)[0]>()
  for (const result of results) {
    const docId = (result as unknown as SearchRecord).docId
    if (!seen.has(docId) || result.score > seen.get(docId)!.score) {
      seen.set(docId, result)
    }
  }

  const topResults = Array.from(seen.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)

  // Return as text content with structured search results.
  // Each result includes enough context for Claude to cite it.
  const formatted = topResults.map((result) => {
    const record = result as unknown as SearchRecord
    const snippet = extractSnippet(record.text, query)
    return {
      type: 'text' as const,
      text:
        `[Document: "${record.title}" (ID: ${record.docId}), Page ${record.page}, Relevance: ${result.score.toFixed(1)}]\n` +
        snippet,
    }
  })

  return [
    {
      type: 'text',
      text: `Found ${results.length} matching passages across the archive. Top ${topResults.length} results:`,
    },
    ...formatted,
  ]
}

function extractSnippet(text: string, query: string): string {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2)
  const textLower = text.toLowerCase()
  let earliestIndex = text.length

  for (const term of terms) {
    const idx = textLower.indexOf(term)
    if (idx !== -1 && idx < earliestIndex) {
      earliestIndex = idx
    }
  }

  // If no exact match found, return the beginning of the text
  if (earliestIndex === text.length) {
    earliestIndex = 0
  }

  const start = Math.max(0, earliestIndex - 150)
  const end = Math.min(text.length, earliestIndex + 350)
  let snippet = text.slice(start, end).trim()

  if (start > 0) snippet = '...' + snippet
  if (end < text.length) snippet = snippet + '...'

  return snippet
}

// --- Read document implementation ---

function readDocument(
  docId: string,
  pages?: string,
): Anthropic.Messages.ToolResultBlockParam['content'] {
  const docs = getDocumentIndex()
  const doc = docs.find((d) => d.id === docId)

  if (!doc) {
    return [{ type: 'text', text: `Document "${docId}" not found in the archive.` }]
  }

  const rawIndex: RawSearchIndex = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'data', 'search-index.json'), 'utf-8'),
  )
  const entry = rawIndex[doc.filename]

  if (!entry) {
    return [
      {
        type: 'text',
        text: `No extracted text available for "${doc.title}" (ID: ${docId}). The document may not have been processed yet.`,
      },
    ]
  }

  let pagesToRead = entry.pages

  if (pages) {
    const match = pages.match(/^(\d+)(?:-(\d+))?$/)
    if (match) {
      const start = parseInt(match[1], 10)
      const end = match[2] ? parseInt(match[2], 10) : start
      pagesToRead = entry.pages.filter((p) => p.page >= start && p.page <= end)
    }
  }

  const text = pagesToRead.map((p) => `[Page ${p.page}]\n${p.text}`).join('\n\n')

  return [
    {
      type: 'text',
      text:
        `Document: "${doc.title}" (ID: ${doc.id}, Category: ${doc.category})\n` +
        `Total pages: ${entry.pages.length}, Showing: ${pagesToRead.length} page(s)\n\n` +
        text,
    },
  ]
}

// --- System prompt with document index ---

export function buildSystemPrompt(): string {
  const docs = getDocumentIndex()

  const docList = docs
    .map(
      (d) =>
        `  - ID: ${d.id} | "${d.title}" | ${d.category} | ${d.pageCount} pages\n    ${d.summary}`,
    )
    .join('\n')

  return `You are a research assistant for the archive of Judith Orloff, M.Ed. - an educator, author, and leadership coach who founded the Radical Love Foundation and created the CHOICES: MBL (Managing by Leadership) program.

You answer questions about her work, writings, and teachings by searching and reading documents from her archive. Always use the search and read tools to find relevant information before answering. Do not guess or make up information.

When citing information, mention which document it came from by title so the user can find it in the archive.

<document_index>
${docList}
</document_index>

<instructions>
1. Read the user's question and identify which documents from the index above might be relevant based on their titles and summaries.
2. Use search_documents to find specific passages, or read_document to read a document you've identified as relevant.
3. If your first search doesn't find enough, try different search terms or read additional documents.
4. Synthesize your answer from what you found, citing the source documents by title.
5. If you can't find relevant information in the archive, say so honestly.
</instructions>

Be conversational but informative. Keep responses focused and relevant to the question asked.`
}
