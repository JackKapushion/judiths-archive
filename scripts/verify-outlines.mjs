import { readFileSync, writeFileSync } from 'fs'

const reviews = JSON.parse(readFileSync('functions/data/document-reviews.json', 'utf-8'))
const searchIndex = JSON.parse(readFileSync('functions/data/search-index.json', 'utf-8'))

// Generic words that appear on most pages and can't distinguish section starts
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'in', 'to', 'for', 'from',
  'with', 'on', 'at', 'by', 'about', 'into', 'through', 'during', 'before',
  'after', 'between', 'under', 'over', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'this', 'that',
  'these', 'those', 'which', 'what', 'who', 'whom', 'how', 'when', 'where',
  'why', 'he', 'she', 'it', 'they', 'we', 'you', 'her', 'his', 'its',
  'their', 'our', 'your', 'not', 'no', 'as', 'if', 'than', 'then', 'so',
  'also', 'just', 'more', 'some', 'any', 'all', 'each', 'every', 'both',
  'few', 'most', 'other', 'such', 'only', 'own', 'same', 'too', 'very',
  'can', 'will', 'may', 'shall', 'should', 'would', 'could', 'might',
  'must', 'need', 'used', 'up', 'out', 'off', 'down', 'back', 'away',
  'here', 'there', 'now', 'still', 'yet', 'already', 'again', 'even',
  'well', 'much', 'many', 'one', 'two', 'three', 'four', 'five',
  'new', 'old', 'first', 'last', 'next', 'long', 'great', 'little',
  'right', 'left', 'good', 'bad', 'high', 'low', 'end', 'part',
  'page', 'pages', 'including', 'includes', 'describes', 'description',
  'covers', 'covering', 'discusses', 'discussing', 'various', 'several',
  'key', 'main', 'based', 'using', 'related', 'following', 'general',
  'specific', 'full', 'brief', 'final', 'initial', 'early', 'late',
  'continued', 'continuation', 'front', 'begins', 'beginning', 'ending',
  'opens', 'opening', 'closing', 'close', 'notes', 'work', 'concept',
  'concepts', 'approach', 'process', 'role', 'section', 'title',
  'cover', 'day', 'introduction', 'overview', 'program'
])

function getFirstPage(pages) {
  const match = pages.match(/\d+/)
  return match ? Number(match[0]) : 1
}

function extractKeywords(text) {
  return text
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .map(w => w.toLowerCase().replace(/^['"-]+|['"-]+$/g, ''))
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .filter((w, i, arr) => arr.indexOf(w) === i)
}

function truncate(str, len = 200) {
  if (!str) return '(empty)'
  const clean = str.replace(/\s+/g, ' ').trim()
  return clean.length > len ? clean.substring(0, len) + '...' : clean
}

function textQualityLabel(pages) {
  if (!pages || pages.length === 0) return 'no-text'
  const avgLen = pages.reduce((s, p) => s + (p.text?.length || 0), 0) / pages.length
  const nonEmpty = pages.filter(p => p.text && p.text.length > 50).length
  const ratio = nonEmpty / pages.length
  if (avgLen < 20) return 'minimal'
  if (ratio < 0.3) return 'sparse'
  if (avgLen < 100) return 'poor'
  if (avgLen < 300) return 'fair'
  return 'good'
}

// Count how many keywords appear in the first N characters of text.
// Headings live at the top of a page, so this is the best signal
// for whether a page is the START of a section.
function headingMatchCount(text, keywords, headLen = 300) {
  if (!text || text.length < 3) return 0
  const head = text.substring(0, headLen).toLowerCase()
  return keywords.filter(kw => head.includes(kw)).length
}

// Count keyword matches across the full page text
function fullMatchCount(text, keywords) {
  if (!text || text.length < 3) return 0
  const lower = text.toLowerCase()
  return keywords.filter(kw => lower.includes(kw)).length
}

// Detect garbled/reversed OCR text. Many scanned PDFs have pages where the
// OCR read text upside-down or backwards, producing strings like
// "any eB aaey am 'Aye Aq pautiosur vay" instead of English.
// If the text is long enough to be real content (50+ chars) but contains
// almost none of the most common English words, it's likely garbled.
const COMMON_ENGLISH = [' the ', ' and ', ' is ', ' of ', ' to ', ' in ',
  ' for ', ' with ', ' that ', ' are ', ' was ', ' have ', ' this ', ' from ',
  ' not ', ' but ', ' you ', ' can ', ' her ', ' she ', ' his ', ' had ',
  ' been ', ' will ', ' our ', ' who ', ' when ', ' what ', ' your ']

function isGarbledText(text) {
  if (!text || text.length < 50) return false
  const lower = ' ' + text.toLowerCase() + ' '
  const commonHits = COMMON_ENGLISH.filter(w => lower.includes(w)).length
  // Scale the threshold by text length. Longer text should have more common words.
  // ~50-200 chars: expect 2+ common words
  // ~200-500 chars: expect 3+ common words
  // 500+ chars: expect 5+ common words
  const threshold = text.length < 200 ? 2 : text.length < 500 ? 3 : 5
  return commonHits < threshold
}

// Check if a page looks like a "Contents" or "Table of Contents" page
// by looking for the word "contents" in the first 100 chars.
function isContentsPage(text) {
  if (!text) return false
  return text.substring(0, 100).toLowerCase().includes('contents')
}

// ── Main ──

const SEARCH_WINDOW = 15
const allResults = []

for (const doc of reviews) {
  if (!doc.outline || doc.outline.length === 0) continue

  const filename = `${doc.id}.pdf`
  const indexEntry = searchIndex[filename]

  if (!indexEntry || !indexEntry.pages) {
    allResults.push({
      docId: doc.id, title: doc.title, pageCount: doc.pageCount,
      textQuality: 'missing',
      sections: [{ title: '(entire document)', status: 'NO_INDEX',
        reason: `No entry for "${filename}" in search-index.json` }]
    })
    continue
  }

  const quality = textQualityLabel(indexEntry.pages)
  const pageMap = new Map()
  for (const p of indexEntry.pages) pageMap.set(p.page, p.text || '')
  const maxPage = indexEntry.pages.length
  // ── TOC page detection ──
  // For documents with 6+ outline sections, detect pages that LIST section
  // titles (like a table of contents). These pages match keywords from many
  // sections but aren't where any section actually starts.
  //
  // To avoid false exclusions, we only count keywords that are UNIQUE to each
  // section. Shared words like "session" (appearing in every section title)
  // can't distinguish sections and would make every page look like a TOC.
  const tocPages = new Set()
  if (doc.outline.length >= 6) {
    const perSectionKw = doc.outline.map(s => extractKeywords(s.title))

    // Count how many sections each keyword appears in
    const kwFreq = new Map()
    for (const kwSet of perSectionKw) {
      for (const kw of kwSet) {
        kwFreq.set(kw, (kwFreq.get(kw) || 0) + 1)
      }
    }

    // For TOC detection, only use keywords unique to 1-2 sections (distinctive)
    const perSectionDistinctKw = perSectionKw.map(kwSet =>
      kwSet.filter(kw => (kwFreq.get(kw) || 0) <= 2)
    )

    for (let p = 1; p <= maxPage; p++) {
      const head = (pageMap.get(p) || '').substring(0, 500).toLowerCase()
      if (!head) continue
      let sectionsMatched = 0
      for (const kwSet of perSectionDistinctKw) {
        if (kwSet.length === 0) continue
        const hits = kwSet.filter(kw => head.includes(kw)).length
        if (hits >= 2) sectionsMatched++
      }
      if (sectionsMatched >= 3) tocPages.add(p)
    }
  }

  const sectionResults = []

  for (const section of doc.outline) {
    const claimedStart = getFirstPage(section.pages)
    const keywords = extractKeywords(section.title)

    // If no useful keywords, section is unverifiable
    if (keywords.length === 0) {
      sectionResults.push({
        title: section.title, pages: section.pages, claimedStart,
        status: 'UNVERIFIABLE', reason: 'No distinctive keywords in title',
        claimedHead: truncate(pageMap.get(claimedStart))
      })
      continue
    }

    const claimedText = pageMap.get(claimedStart) || ''
    const claimedHeadMatches = headingMatchCount(claimedText, keywords)
    const claimedFullMatches = fullMatchCount(claimedText, keywords)

    // Search nearby pages for better heading matches, skipping TOC pages
    // and explicit "Contents" pages
    const lo = Math.max(1, claimedStart - SEARCH_WINDOW)
    const hi = Math.min(maxPage, claimedStart + SEARCH_WINDOW)

    let bestOtherPage = null
    let bestOtherHeadCount = 0
    let bestOtherFullCount = 0

    for (let p = lo; p <= hi; p++) {
      if (p === claimedStart) continue
      // Skip detected TOC pages and explicit "Contents" pages
      if (tocPages.has(p)) continue
      const text = pageMap.get(p) || ''
      if (isContentsPage(text)) continue
      const hc = headingMatchCount(text, keywords)
      const fc = fullMatchCount(text, keywords)
      if (hc > bestOtherHeadCount || (hc === bestOtherHeadCount && fc > bestOtherFullCount)) {
        bestOtherPage = p
        bestOtherHeadCount = hc
        bestOtherFullCount = fc
      }
    }

    // Decision logic:
    // A mismatch means the claimed page is WRONG and another page is RIGHT.
    // We only flag a mismatch when the evidence is clear.

    const claimedIsGarbled = isGarbledText(claimedText)

    if (claimedText.length < 5 && bestOtherHeadCount > 0) {
      // Claimed page is empty/blank, another page has the heading
      sectionResults.push({
        title: section.title, pages: section.pages, claimedStart,
        status: 'MISMATCH', suggestedStart: bestOtherPage,
        confidence: 'high', reason: 'Claimed page is empty',
        claimedHead: '(empty)',
        suggestedHead: truncate(pageMap.get(bestOtherPage))
      })
    } else if (claimedIsGarbled && claimedHeadMatches === 0) {
      // Claimed page has garbled/reversed OCR text. Can't tell if the page
      // number is right or wrong because the text is unreadable.
      sectionResults.push({
        title: section.title, pages: section.pages, claimedStart,
        status: 'UNVERIFIABLE',
        reason: 'Claimed page has garbled/reversed OCR text',
        keywords,
        claimedHead: truncate(pageMap.get(claimedStart)),
        ...(bestOtherPage ? { note: `Nearest match: page ${bestOtherPage} (${bestOtherHeadCount} heading kw)` } : {})
      })
    } else if (claimedHeadMatches === 0 && bestOtherHeadCount >= 2) {
      // Claimed page heading has zero matches, another page heading has 2+ matches
      sectionResults.push({
        title: section.title, pages: section.pages, claimedStart,
        status: 'MISMATCH', suggestedStart: bestOtherPage,
        confidence: 'high',
        reason: `0 heading keywords on claimed page, ${bestOtherHeadCount} on page ${bestOtherPage}`,
        keywords,
        claimedHead: truncate(pageMap.get(claimedStart)),
        suggestedHead: truncate(pageMap.get(bestOtherPage))
      })
    } else if (claimedHeadMatches === 0 && bestOtherHeadCount === 1) {
      // Zero vs 1 heading match. Might be real, might be noise.
      sectionResults.push({
        title: section.title, pages: section.pages, claimedStart,
        status: 'MISMATCH', suggestedStart: bestOtherPage,
        confidence: 'low',
        reason: `0 heading keywords on claimed page, 1 on page ${bestOtherPage}`,
        keywords,
        claimedHead: truncate(pageMap.get(claimedStart)),
        suggestedHead: truncate(pageMap.get(bestOtherPage))
      })
    } else if (claimedHeadMatches === 0 && bestOtherHeadCount === 0) {
      if (claimedFullMatches > 0) {
        // Keywords found in body but not heading. Probably correct
        // (the section content is on this page even if the heading isn't at the top).
        sectionResults.push({
          title: section.title, pages: section.pages, claimedStart,
          status: 'CORRECT', confidence: 'low',
          note: `${claimedFullMatches} keywords in body, 0 in heading`
        })
      } else {
        // No matches anywhere nearby. Can't verify.
        sectionResults.push({
          title: section.title, pages: section.pages, claimedStart,
          status: 'UNVERIFIABLE',
          reason: `No keyword matches found in pages ${lo}-${hi}`,
          keywords,
          claimedHead: truncate(pageMap.get(claimedStart))
        })
      }
    } else if (claimedHeadMatches > 0 && bestOtherHeadCount > claimedHeadMatches + 1) {
      // Claimed page has SOME heading matches, but another page has significantly more.
      // This is a weaker signal (maybe off-by-one where both pages have the heading).
      sectionResults.push({
        title: section.title, pages: section.pages, claimedStart,
        status: 'CHECK',
        suggestedStart: bestOtherPage,
        reason: `Claimed page has ${claimedHeadMatches} heading keywords, page ${bestOtherPage} has ${bestOtherHeadCount}`,
        keywords,
        claimedHead: truncate(pageMap.get(claimedStart)),
        suggestedHead: truncate(pageMap.get(bestOtherPage))
      })
    } else {
      // Claimed page has heading matches and no nearby page is clearly better
      const conf = claimedHeadMatches >= 3 ? 'high' : claimedHeadMatches >= 2 ? 'medium' : 'low'
      sectionResults.push({
        title: section.title, pages: section.pages, claimedStart,
        status: 'CORRECT', confidence: conf,
        headMatches: claimedHeadMatches, totalKeywords: keywords.length
      })
    }
  }

  allResults.push({
    docId: doc.id, title: doc.title, pageCount: doc.pageCount,
    textQuality: quality, totalSections: doc.outline.length,
    tocPages: [...tocPages].sort((a, b) => a - b),
    sections: sectionResults
  })
}

// ── Report ──

const allSections = allResults.flatMap(r => r.sections)
const correct = allSections.filter(s => s.status === 'CORRECT')
const mismatches = allSections.filter(s => s.status === 'MISMATCH')
const checks = allSections.filter(s => s.status === 'CHECK')
const unverifiable = allSections.filter(s => s.status === 'UNVERIFIABLE' || s.status === 'NO_INDEX')

let report = ''
report += '# Outline Page Number Verification Report\n\n'
report += `Total documents: ${allResults.length}\n`
report += `Total outline sections: ${allSections.length}\n`
report += `Verified correct: ${correct.length}\n`
report += `Mismatches: ${mismatches.length} (${mismatches.filter(s => s.confidence === 'high').length} high confidence, ${mismatches.filter(s => s.confidence === 'low').length} low confidence)\n`
report += `Needs review: ${checks.length}\n`
report += `Unverifiable: ${unverifiable.length}\n\n`

// ── HIGH CONFIDENCE MISMATCHES ──
report += '---\n\n## HIGH CONFIDENCE MISMATCHES\n\n'
report += 'These sections have zero title keywords in the claimed page heading,\n'
report += 'but a nearby page clearly has the heading.\n\n'

const highMM = allResults.filter(r => r.sections.some(s => s.status === 'MISMATCH' && s.confidence === 'high'))
if (highMM.length === 0) {
  report += '(none)\n\n'
} else {
  for (const doc of highMM) {
    const mm = doc.sections.filter(s => s.status === 'MISMATCH' && s.confidence === 'high')
    report += `### Doc ${doc.docId}: ${doc.title}\n`
    report += `${doc.pageCount} pages | Text: ${doc.textQuality}`
    if (doc.tocPages?.length) report += ` | TOC pages excluded: ${doc.tocPages.join(', ')}`
    report += '\n\n'
    for (const s of mm) {
      report += `**"${s.title}"**\n`
      report += `Current: "${s.pages}" -> page ${s.claimedStart}\n`
      report += `Suggested: page ${s.suggestedStart}\n`
      report += `Reason: ${s.reason}\n`
      report += `Page ${s.claimedStart}: "${s.claimedHead}"\n`
      report += `Page ${s.suggestedStart}: "${s.suggestedHead}"\n\n`
    }
  }
}

// ── LOW CONFIDENCE MISMATCHES ──
report += '---\n\n## LOW CONFIDENCE MISMATCHES\n\n'
report += 'Zero heading keywords on claimed page, only 1 on the suggested page.\n'
report += 'Could be real or could be noise.\n\n'

const lowMM = allResults.filter(r => r.sections.some(s => s.status === 'MISMATCH' && s.confidence === 'low'))
if (lowMM.length === 0) {
  report += '(none)\n\n'
} else {
  for (const doc of lowMM) {
    const mm = doc.sections.filter(s => s.status === 'MISMATCH' && s.confidence === 'low')
    report += `### Doc ${doc.docId}: ${doc.title}\n`
    report += `${doc.pageCount} pages | Text: ${doc.textQuality}\n\n`
    for (const s of mm) {
      report += `**"${s.title}"**\n`
      report += `Current: "${s.pages}" -> page ${s.claimedStart}\n`
      report += `Suggested: page ${s.suggestedStart}\n`
      report += `Reason: ${s.reason}\n`
      if (s.keywords) report += `Keywords: ${s.keywords.join(', ')}\n`
      report += `Page ${s.claimedStart}: "${s.claimedHead}"\n`
      report += `Page ${s.suggestedStart}: "${s.suggestedHead}"\n\n`
    }
  }
}

// ── NEEDS REVIEW ──
report += '---\n\n## NEEDS REVIEW\n\n'
report += 'Claimed page has some heading keywords but a nearby page has significantly more.\n\n'

const checkDocs = allResults.filter(r => r.sections.some(s => s.status === 'CHECK'))
if (checkDocs.length === 0) {
  report += '(none)\n\n'
} else {
  for (const doc of checkDocs) {
    const cc = doc.sections.filter(s => s.status === 'CHECK')
    report += `### Doc ${doc.docId}: ${doc.title}\n`
    report += `${doc.pageCount} pages | Text: ${doc.textQuality}\n\n`
    for (const s of cc) {
      report += `**"${s.title}"**\n`
      report += `Current: "${s.pages}" -> page ${s.claimedStart}\n`
      report += `Possible: page ${s.suggestedStart}\n`
      report += `Reason: ${s.reason}\n`
      report += `Page ${s.claimedStart}: "${s.claimedHead}"\n`
      report += `Page ${s.suggestedStart}: "${s.suggestedHead}"\n\n`
    }
  }
}

// ── UNVERIFIABLE ──
report += '---\n\n## UNVERIFIABLE\n\n'
report += 'Not enough text or keywords to verify.\n\n'

const unverDocs = allResults.filter(r => r.sections.some(s => s.status === 'UNVERIFIABLE' || s.status === 'NO_INDEX'))
if (unverDocs.length === 0) {
  report += '(none)\n\n'
} else {
  for (const doc of unverDocs) {
    const uv = doc.sections.filter(s => s.status === 'UNVERIFIABLE' || s.status === 'NO_INDEX')
    report += `### Doc ${doc.docId}: ${doc.title}\n`
    report += `${doc.pageCount} pages | Text: ${doc.textQuality}\n\n`
    for (const s of uv) {
      report += `- **"${s.title}"** (page ${s.claimedStart}): ${s.reason}\n`
      if (s.keywords) report += `  Keywords: ${s.keywords.join(', ')}\n`
      if (s.claimedHead) report += `  Text: "${s.claimedHead}"\n`
    }
    report += '\n'
  }
}

// ── VERIFIED CORRECT ──
report += '---\n\n## VERIFIED CORRECT\n\n'

for (const doc of allResults) {
  const ok = doc.sections.filter(s => s.status === 'CORRECT')
  if (ok.length === 0) continue
  const hi = ok.filter(s => s.confidence === 'high').length
  const med = ok.filter(s => s.confidence === 'medium').length
  const lo = ok.filter(s => s.confidence === 'low').length
  report += `### Doc ${doc.docId}: ${doc.title} (${ok.length}/${doc.totalSections})`
  if (hi) report += ` | ${hi} high`
  if (med) report += ` | ${med} med`
  if (lo) report += ` | ${lo} low`
  report += '\n'
  for (const s of ok) {
    let line = `- "${s.title}" -> p${s.claimedStart} [${s.confidence}]`
    if (s.headMatches) line += ` (${s.headMatches}/${s.totalKeywords} heading kw)`
    if (s.note) line += ` (${s.note})`
    report += line + '\n'
  }
  report += '\n'
}

writeFileSync('outline-verification-report.md', report)
console.log(report)
console.log('\n\nReport saved to outline-verification-report.md')
