import { documents } from './documents'

export interface Citation {
  fullMatch: string
  docId: string
  title: string
  page: number
  endPage?: number
}

// Build a lookup from lowercase title to document for fast matching.
// Computed once at module load.
const titleToDoc = new Map(
  documents.map((d) => [d.title.toLowerCase(), d])
)

// Match [Title, p. X] or [Title, pp. X-Y]
// The title can contain anything except square brackets.
// Page part: "p. 5" or "pp. 12-15"
const CITATION_RE = /\[([^\]]+),\s+pp?\.\s+(\d+)(?:\s*-\s*(\d+))?\]/g

export function parseCitations(text: string): (string | Citation)[] {
  const parts: (string | Citation)[] = []
  let lastIndex = 0

  for (const match of text.matchAll(CITATION_RE)) {
    const [fullMatch, rawTitle, pageStr, endPageStr] = match
    const matchIndex = match.index!

    // Add text before this match
    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex))
    }

    const title = rawTitle.trim()
    const doc = titleToDoc.get(title.toLowerCase())

    if (doc) {
      parts.push({
        fullMatch,
        docId: doc.id,
        title: doc.title,
        page: parseInt(pageStr, 10),
        endPage: endPageStr ? parseInt(endPageStr, 10) : undefined,
      })
    } else {
      // No matching document found, keep as plain text
      parts.push(fullMatch)
    }

    lastIndex = matchIndex + fullMatch.length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}
