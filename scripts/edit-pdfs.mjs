import { readFile, writeFile } from 'fs/promises'
import { PDFDocument } from 'pdf-lib'

async function removePages(inputPath, outputPath, pagesToRemove) {
  const bytes = await readFile(inputPath)
  const pdf = await PDFDocument.load(bytes)
  // Remove pages in reverse order so indices don't shift
  for (const pageIndex of pagesToRemove.sort((a, b) => b - a)) {
    pdf.removePage(pageIndex)
  }
  const output = await pdf.save()
  await writeFile(outputPath, output)
  console.log(`Wrote ${outputPath} (${pdf.getPageCount()} pages)`)
}

async function splitPdf(inputPath, outputConfigs) {
  const bytes = await readFile(inputPath)
  const srcPdf = await PDFDocument.load(bytes)

  for (const { outputPath, startPage, endPage } of outputConfigs) {
    const newPdf = await PDFDocument.create()
    // startPage and endPage are 1-indexed, inclusive
    const indices = []
    for (let i = startPage - 1; i <= endPage - 1; i++) {
      indices.push(i)
    }
    const copiedPages = await newPdf.copyPages(srcPdf, indices)
    for (const page of copiedPages) {
      newPdf.addPage(page)
    }
    const output = await newPdf.save()
    await writeFile(outputPath, output)
    console.log(`Wrote ${outputPath} (${newPdf.getPageCount()} pages)`)
  }
}

const DOCS = 'public/documents'

// Doc 1: Remove page 1 (sharpie cover)
console.log('--- Doc 1: Remove sharpie cover ---')
await removePages(`${DOCS}/1.pdf`, `${DOCS}/1.pdf`, [0])

// Doc 2: Split into 2a (pages 2-8) and 2b (pages 9-30), dropping sharpie cover (page 1)
console.log('--- Doc 2: Split into 2a and 2b ---')
await splitPdf(`${DOCS}/SKM_300i24061408400.pdf`, [
  { outputPath: `${DOCS}/2a.pdf`, startPage: 2, endPage: 8 },
  { outputPath: `${DOCS}/2b.pdf`, startPage: 9, endPage: 30 },
])

// Doc 3: Split into 3a-3g, dropping sharpie cover (page 1)
console.log('--- Doc 3: Split into 3a-3g ---')
await splitPdf(`${DOCS}/SKM_300i24061408410.pdf`, [
  { outputPath: `${DOCS}/3a.pdf`, startPage: 2, endPage: 3 },   // Mindfulness curriculum for parents & children
  { outputPath: `${DOCS}/3b.pdf`, startPage: 4, endPage: 8 },   // Friendship Circle draft enrollment concept
  { outputPath: `${DOCS}/3c.pdf`, startPage: 9, endPage: 11 },  // Disabilities sensitivity training / anti-bullying
  { outputPath: `${DOCS}/3d.pdf`, startPage: 12, endPage: 18 }, // Friendship Circle sensitivity training contract
  { outputPath: `${DOCS}/3e.pdf`, startPage: 19, endPage: 25 }, // Email correspondence (Shemtov, Grossbaum, Judith)
  { outputPath: `${DOCS}/3f.pdf`, startPage: 26, endPage: 28 }, // Letter from the Rebbe on disabilities
  { outputPath: `${DOCS}/3g.pdf`, startPage: 29, endPage: 53 }, // Montessori Teacher Training paper
])

// Doc 4: Split into 4a-4m, dropping sharpie covers (pages 1-3)
// 4a combines all pages with the "Transformation" branded border (non-contiguous ranges)
console.log('--- Doc 4: Split into 4a-4m ---')
{
  const bytes = await readFile(`${DOCS}/SKM_300i24061408440.pdf`)
  const srcPdf = await PDFDocument.load(bytes)

  // 4a: Transformation Student Workbook + Participant Handout Collection
  // Structural pages from Doc 9 (title, overview, schedule, session divider) + branded handouts from Doc 4
  const combined = await PDFDocument.create()

  // Prepend Doc 9 structural pages (Transformation Student Workbook shell)
  const bytes9 = await readFile(`${DOCS}/SKM_300i24061409010.pdf`)
  const srcPdf9 = await PDFDocument.load(bytes9)
  for (const pageNum of [99, 105, 107, 109]) {
    const [page] = await combined.copyPages(srcPdf9, [pageNum - 1])
    combined.addPage(page)
  }

  // Doc 4 branded handout content (pages 4-9, 47-48, 49-55)
  const ranges = [[4, 9], [47, 48], [49, 55]]
  for (const [start, end] of ranges) {
    const indices = []
    for (let i = start - 1; i <= end - 1; i++) indices.push(i)
    const pages = await combined.copyPages(srcPdf, indices)
    for (const p of pages) combined.addPage(p)
  }
  const out = await combined.save()
  await writeFile(`${DOCS}/4a.pdf`, out)
  console.log(`Wrote ${DOCS}/4a.pdf (${combined.getPageCount()} pages)`)
}
await splitPdf(`${DOCS}/SKM_300i24061408440.pdf`, [
  { outputPath: `${DOCS}/4b.pdf`, startPage: 10, endPage: 46 },   // ETP II Transformation Session 1 Instructor's Manual
  { outputPath: `${DOCS}/4c.pdf`, startPage: 56, endPage: 66 },   // Chapter 10 - Sources of Information
  { outputPath: `${DOCS}/4d.pdf`, startPage: 67, endPage: 68 },   // The 7-11 Game
  { outputPath: `${DOCS}/4e.pdf`, startPage: 69, endPage: 70 },   // Crossing the Abyss Game
  { outputPath: `${DOCS}/4f.pdf`, startPage: 71, endPage: 71 },   // Mom and Dad Game
  { outputPath: `${DOCS}/4g.pdf`, startPage: 72, endPage: 78 },   // Universe Game
  { outputPath: `${DOCS}/4h.pdf`, startPage: 79, endPage: 79 },   // "Because There's So Much To Learn And So Little Time"
  { outputPath: `${DOCS}/4i.pdf`, startPage: 80, endPage: 92 },   // ETP II Transformation Session 2 Instructor's Manual
  { outputPath: `${DOCS}/4j.pdf`, startPage: 93, endPage: 106 },  // Transformation Instructor's Manual Session 2 (variant)
  { outputPath: `${DOCS}/4k.pdf`, startPage: 107, endPage: 107 }, // ETP II Session Two Program Outline
  { outputPath: `${DOCS}/4l.pdf`, startPage: 108, endPage: 117 }, // ETP I Transformation Session 2 Instructor's Manual
  { outputPath: `${DOCS}/4m.pdf`, startPage: 118, endPage: 122 }, // Chapter Four - The Elements of Magic
])

// Doc 5: Split into 5a-5b, skipping pages 47-48 (duplicate of Interpretation & Projection in 4a)
console.log('--- Doc 5: Split into 5a-5b ---')
await splitPdf(`${DOCS}/SKM_300i24061408470.pdf`, [
  { outputPath: `${DOCS}/5a.pdf`, startPage: 1, endPage: 10 },  // "The Global Brain" by Peter Russell excerpt
  { outputPath: `${DOCS}/5b.pdf`, startPage: 11, endPage: 46 }, // ETP II Session 3 complete packet
])

// Doc 6: Split into 6a-6c, dropping sharpie cover (page 1)
console.log('--- Doc 6: Split into 6a-6c ---')
await splitPdf(`${DOCS}/SKM_300i24061408520.pdf`, [
  { outputPath: `${DOCS}/6a.pdf`, startPage: 2, endPage: 12 },   // Patent Application: Experiential Learning System
  { outputPath: `${DOCS}/6b.pdf`, startPage: 13, endPage: 35 },  // USPTO Trademark: Disruptive Learning Technology
  { outputPath: `${DOCS}/6c.pdf`, startPage: 36, endPage: 131 }, // ETP Discovery and Change complete curriculum
])

// Doc 7: Remove sharpie cover (page 1), keep as single document
console.log('--- Doc 7: Remove sharpie cover ---')
await splitPdf(`${DOCS}/SKM_300i24061408540.pdf`, [
  { outputPath: `${DOCS}/7.pdf`, startPage: 2, endPage: 98 },
])

// Doc 7+8: Merge MBL parts and remove blank pages
console.log('--- Doc 7+8: Merge MBL and remove blanks ---')
{
  const bytes7 = await readFile(`${DOCS}/SKM_300i24061408540.pdf`)
  const bytes8 = await readFile(`${DOCS}/SKM_300i24061408570.pdf`)
  const pdf7 = await PDFDocument.load(bytes7)
  const pdf8 = await PDFDocument.load(bytes8)
  const merged = await PDFDocument.create()

  // Copy Doc 7 pages 2-98 (skip sharpie cover page 1)
  const indices7 = []
  for (let i = 1; i <= 97; i++) indices7.push(i)
  const pages7 = await merged.copyPages(pdf7, indices7)
  for (const p of pages7) merged.addPage(p)

  // Copy Doc 8 all pages, skipping blank/near-empty ones
  // First, identify blank pages by checking if page has any meaningful text content
  // We'll use a size heuristic - blank scanned pages are typically very small in content
  const totalPages8 = pdf8.getPageCount()
  const indices8 = []
  for (let i = 0; i < totalPages8; i++) indices8.push(i)
  const pages8 = await merged.copyPages(pdf8, indices8)

  // Read the search index to find blank pages
  const searchIndex = JSON.parse(await readFile('public/search-index.json', 'utf-8'))
  const doc8Entries = searchIndex['SKM_300i24061408570.pdf']?.pages || []
  const blankPages8 = new Set()
  for (const entry of doc8Entries) {
    const text = entry.text.trim()
    if (text.length < 10) {
      blankPages8.add(entry.page - 1) // convert to 0-indexed
    }
  }

  let skipped = 0
  for (let i = 0; i < pages8.length; i++) {
    if (blankPages8.has(i)) {
      skipped++
      continue
    }
    merged.addPage(pages8[i])
  }

  const out = await merged.save()
  await writeFile(`${DOCS}/7.pdf`, out)
  console.log(`Wrote ${DOCS}/7.pdf (${merged.getPageCount()} pages, skipped ${skipped} blank pages from Doc 8)`)
}

// Doc 9: Split into 9a-9e (dropping handwritten dividers on pages 35-36, 59-60, 97-98)
// Section 4 structural pages (99, 105, 107, 109) merged into 4a above
console.log('--- Doc 9: Split into 9a-9e ---')
{
  const bytes = await readFile(`${DOCS}/SKM_300i24061409010.pdf`)
  const srcPdf = await PDFDocument.load(bytes)

  // 9a: Choices for Success Participant Workbook (pages 1-34)
  const pdf9a = await PDFDocument.create()
  const idx9a = []
  for (let i = 0; i <= 33; i++) idx9a.push(i)
  const pages9a = await pdf9a.copyPages(srcPdf, idx9a)
  for (const p of pages9a) pdf9a.addPage(p)
  await writeFile(`${DOCS}/9a.pdf`, await pdf9a.save())
  console.log(`Wrote ${DOCS}/9a.pdf (${pdf9a.getPageCount()} pages)`)

  // 9b: Radical Choices - Leadership in Recovery Day One Workbook (pages 37-58)
  const pdf9b = await PDFDocument.create()
  const idx9b = []
  for (let i = 36; i <= 57; i++) idx9b.push(i)
  const pages9b = await pdf9b.copyPages(srcPdf, idx9b)
  for (const p of pages9b) pdf9b.addPage(p)
  await writeFile(`${DOCS}/9b.pdf`, await pdf9b.save())
  console.log(`Wrote ${DOCS}/9b.pdf (${pdf9b.getPageCount()} pages)`)

  // 9c: Emotional Literacy Pitch Collection - three branding eras (pages 61-68, 73-84)
  // Radical Choices version, Real Impact Learning version, Orloff Consulting version
  const pdf9c = await PDFDocument.create()
  const ranges9c = [[61, 68], [73, 84]]
  for (const [start, end] of ranges9c) {
    const indices = []
    for (let i = start - 1; i <= end - 1; i++) indices.push(i)
    const pages = await pdf9c.copyPages(srcPdf, indices)
    for (const p of pages) pdf9c.addPage(p)
  }
  await writeFile(`${DOCS}/9c.pdf`, await pdf9c.save())
  console.log(`Wrote ${DOCS}/9c.pdf (${pdf9c.getPageCount()} pages)`)

  // 9d: Kosmos Essay Draft v2 (pages 69-74)
  // Page 73 shared with 9c - essay conclusion + RIL pitch start on same page
  const pdf9d = await PDFDocument.create()
  const idx9d = []
  for (let i = 68; i <= 73; i++) idx9d.push(i)
  const pages9d = await pdf9d.copyPages(srcPdf, idx9d)
  for (const p of pages9d) pdf9d.addPage(p)
  await writeFile(`${DOCS}/9d.pdf`, await pdf9d.save())
  console.log(`Wrote ${DOCS}/9d.pdf (${pdf9d.getPageCount()} pages)`)

  // 9e: DeepSee App Proposal and Patent Research (pages 87-96)
  const pdf9e = await PDFDocument.create()
  const idx9e = []
  for (let i = 86; i <= 95; i++) idx9e.push(i)
  const pages9e = await pdf9e.copyPages(srcPdf, idx9e)
  for (const p of pages9e) pdf9e.addPage(p)
  await writeFile(`${DOCS}/9e.pdf`, await pdf9e.save())
  console.log(`Wrote ${DOCS}/9e.pdf (${pdf9e.getPageCount()} pages)`)
}

// Doc 10: Split into 10a-10b, dropping sharpie cover (page 1) and blank (page 2)
console.log('--- Doc 10: Split into 10a-10b ---')
await splitPdf(`${DOCS}/SKM_300i24061409030.pdf`, [
  { outputPath: `${DOCS}/10a.pdf`, startPage: 3, endPage: 60 },  // Evening Series Manual (outlines + logistics)
  { outputPath: `${DOCS}/10b.pdf`, startPage: 61, endPage: 70 }, // RIL - Personal Responsibility, Emotional Mastery and Success
])

// Doc 11: Split into 11a-11c, dropping sharpie cover (page 1), divider (page 96),
// and Buckminster Fuller excerpt (pages 2-3, duplicate of content in 6c)
console.log('--- Doc 11: Split into 11a-11c ---')
await splitPdf(`${DOCS}/SKM_300i24061409080.pdf`, [
  { outputPath: `${DOCS}/11a.pdf`, startPage: 4, endPage: 95 },   // ETP Instructor's Manual DRAFT + Session 8 notes
  { outputPath: `${DOCS}/11b.pdf`, startPage: 97, endPage: 104 }, // Graduate Training Outline (Choices Weekend follow-up)
  { outputPath: `${DOCS}/11c.pdf`, startPage: 105, endPage: 144 }, // Choices Weekend Instructor's Manual
])

// Doc 12: Split into 12a-12b (two companion booklets, no covers to remove)
console.log('--- Doc 12: Split into 12a-12b ---')
await splitPdf(`${DOCS}/SKM_300i25011008081.pdf`, [
  { outputPath: `${DOCS}/12a.pdf`, startPage: 1, endPage: 50 },  // Natural Leadership: A Core Competency of Clarity
  { outputPath: `${DOCS}/12b.pdf`, startPage: 51, endPage: 98 }, // Awakened Relationships: A Core Competency of Unconditional Love
])

// Doc 13: Split into 13a-13e, dropping sharpie cover (page 1), bleed-through (page 2),
// duplicate convocation speech (pages 27-35), garbled notes (pages 37-38),
// and duplicate "Coupledom" abstracts (pages 65-66, 83-84)
console.log('--- Doc 13: Split into 13a-13e ---')
await splitPdf(`${DOCS}/SKM_300i25011008120.pdf`, [
  { outputPath: `${DOCS}/13a.pdf`, startPage: 3, endPage: 9 },     // VICI Opening Ceremony Speech (1975)
  { outputPath: `${DOCS}/13b.pdf`, startPage: 11, endPage: 25 },   // Burlington College Convocation Materials (2015)
  { outputPath: `${DOCS}/13c.pdf`, startPage: 39, endPage: 45 },   // Letters to W. Edwards Deming (1992)
  { outputPath: `${DOCS}/13e.pdf`, startPage: 105, endPage: 124 }, // Leadership Education Presentation (garbled slides)
])

// 13d: Radical Love Foundation materials, non-contiguous (skip duplicate Coupledom abstracts)
{
  const bytes = await readFile(`${DOCS}/SKM_300i25011008120.pdf`)
  const srcPdf = await PDFDocument.load(bytes)
  const pdf13d = await PDFDocument.create()
  const ranges = [[47, 64], [67, 82], [85, 104]]
  for (const [start, end] of ranges) {
    const indices = []
    for (let i = start - 1; i <= end - 1; i++) indices.push(i)
    const pages = await pdf13d.copyPages(srcPdf, indices)
    for (const p of pages) pdf13d.addPage(p)
  }
  await writeFile(`${DOCS}/13d.pdf`, await pdf13d.save())
  console.log(`Wrote ${DOCS}/13d.pdf (${pdf13d.getPageCount()} pages)`)
}

// Doc 14: Remove sharpie cover (pages 1-2) and trailing blanks (pages 15-16)
console.log('--- Doc 14: Remove covers and blanks ---')
await splitPdf(`${DOCS}/SKM_300i25011008160.pdf`, [
  { outputPath: `${DOCS}/14.pdf`, startPage: 3, endPage: 14 },
])

// Doc 15: Split into 15a-15c, dropping sharpie covers and scan artifacts
console.log('--- Doc 15: Split into 15a-15c ---')
await splitPdf(`${DOCS}/SKM_300i25011008170.pdf`, [
  { outputPath: `${DOCS}/15a.pdf`, startPage: 3, endPage: 16 },  // Choices Weekend Personal Discovery Form
  { outputPath: `${DOCS}/15b.pdf`, startPage: 19, endPage: 37 }, // Leadership in Recovery Day Two Workbook
  { outputPath: `${DOCS}/15c.pdf`, startPage: 39, endPage: 66 }, // Train the Trainer Session Three Workbook
])

// Doc 16: Split into 16a-16c, dropping sharpie cover (pages 1-2) and trailing blanks (pages 63-64)
console.log('--- Doc 16: Split into 16a-16c ---')
await splitPdf(`${DOCS}/SKM_300i25011008220.pdf`, [
  { outputPath: `${DOCS}/16a.pdf`, startPage: 3, endPage: 3 },    // Inward Bound Institute Proposal fragment
  { outputPath: `${DOCS}/16b.pdf`, startPage: 5, endPage: 39 },   // RLF Readings and Workshop Materials
  { outputPath: `${DOCS}/16c.pdf`, startPage: 41, endPage: 62 },  // Radical Love Participant Workbook
])

// Doc 17: Remove sharpie cover (page 1), keep as single document
console.log('--- Doc 17: Remove sharpie cover ---')
await splitPdf(`${DOCS}/SKM_300i25011008260.pdf`, [
  { outputPath: `${DOCS}/17.pdf`, startPage: 2, endPage: 84 },
])

// Doc 18: Split into 18 (workbook) and 18a (Adyashanti interview)
// Remove sharpie cover (pages 1-2), blank separator (page 64), trailing blanks (102-104)
console.log('--- Doc 18: Split into 18 and 18a ---')
await splitPdf(`${DOCS}/SKM_300i25011008280.pdf`, [
  { outputPath: `${DOCS}/18.pdf`, startPage: 3, endPage: 63 },   // The Art & Science of Mindful Living workbook
  { outputPath: `${DOCS}/18a.pdf`, startPage: 65, endPage: 101 }, // Adyashanti interview transcript
])

// Doc 19: Split into 19 (training workbook) and 19a (TAG business docs)
// Remove sharpie cover (pages 1-2). Pages 3-11 are loose publishing items (19a).
// Pages 13-128 are the complete tabbed workbook (19).
console.log('--- Doc 19: Split into 19 and 19a ---')
await splitPdf(`${DOCS}/SKM_300i25011008290.pdf`, [
  { outputPath: `${DOCS}/19a.pdf`, startPage: 3, endPage: 11 },  // TAG book business/publishing documents
  { outputPath: `${DOCS}/19.pdf`, startPage: 13, endPage: 128 }, // Applying Accelerated Learning to Course Design workbook
])

// Doc 20: Split into 20 (Fielding application) and 20a (WHY CPR training)
// Remove sharpie cover (pages 1-2) and handwritten divider (pages 27-28)
console.log('--- Doc 20: Split into 20 and 20a ---')
await splitPdf(`${DOCS}/SKM_300i25011008310.pdf`, [
  { outputPath: `${DOCS}/20.pdf`, startPage: 3, endPage: 26 },   // Fielding Graduate University EdD Application
  { outputPath: `${DOCS}/20a.pdf`, startPage: 29, endPage: 184 }, // WHY's Guide to the Human Side of CPR training program
])

// Doc 21: Split into 21 (Secrets notes), 21a (EI interview), 21b (integrity essay), 21c (Learning Architecture)
// Skip neuroscience paper (pages 59-62, 67-84) - third-party, badly scanned
console.log('--- Doc 21: Split into 21, 21a, 21b, 21c ---')
await splitPdf(`${DOCS}/SKM_300i25011008330.pdf`, [
  { outputPath: `${DOCS}/21.pdf`, startPage: 1, endPage: 21 },   // Secrets presentation visual notes (May 1984)
  { outputPath: `${DOCS}/21a.pdf`, startPage: 23, endPage: 53 }, // EI interview transcript
  { outputPath: `${DOCS}/21b.pdf`, startPage: 55, endPage: 58 }, // Conditioning's Last Stand essay (skip p56 bleed-through? no, contiguous range keeps it)
  { outputPath: `${DOCS}/21c.pdf`, startPage: 63, endPage: 65 }, // Learning Architecture draft intro
])

// Doc 22+23: Merge TAG Instructor Manual from two scan batches
// Doc 22: pages 3-100 (skip sharpie cover 1-2)
// Doc 23: pages 3-78 (skip sharpie cover 1-2)
console.log('--- Doc 22+23: Merge TAG Instructor Manual ---')
{
  const bytes22 = await readFile(`${DOCS}/SKM_300i25011008351.pdf`)
  const bytes23 = await readFile(`${DOCS}/SKM_300i25011008360.pdf`)
  const pdf22 = await PDFDocument.load(bytes22)
  const pdf23 = await PDFDocument.load(bytes23)
  const merged = await PDFDocument.create()

  // Copy Doc 22 pages 3-100 (0-indexed: 2-99)
  const indices22 = []
  for (let i = 2; i <= 99; i++) indices22.push(i)
  const pages22 = await merged.copyPages(pdf22, indices22)
  for (const p of pages22) merged.addPage(p)

  // Copy Doc 23 pages 3-78 (0-indexed: 2-77)
  const indices23 = []
  for (let i = 2; i <= 77; i++) indices23.push(i)
  const pages23 = await merged.copyPages(pdf23, indices23)
  for (const p of pages23) merged.addPage(p)

  const out = await merged.save()
  await writeFile(`${DOCS}/22.pdf`, out)
  console.log(`Wrote ${DOCS}/22.pdf (${merged.getPageCount()} pages)`)
}

// Doc 24: Remove sharpie cover (p1) and stray page (p37)
console.log('--- Doc 24: Clean up TTT Workbook ---')
await splitPdf(`${DOCS}/SKM_300i25011008400.pdf`, [
  { outputPath: `${DOCS}/24.pdf`, startPage: 2, endPage: 36 }, // Core Technology Programs TTT Workbook
])

// Doc 25: Split into 25 (conflict course), 25a (supplementary), 25b (facilitator guide), 25c (Breakthrough workbook)
// Skip sharpie covers (pp 1-2), duplicate Program Overview (pp 119-150)
console.log('--- Doc 25: Split into 25, 25a, 25b, 25c ---')
await splitPdf(`${DOCS}/SKM_300i25011008410.pdf`, [
  { outputPath: `${DOCS}/25.pdf`, startPage: 3, endPage: 49 },    // The Nature of Conflict course materials
  { outputPath: `${DOCS}/25a.pdf`, startPage: 51, endPage: 67 },  // Model for Change supplementary materials
  { outputPath: `${DOCS}/25b.pdf`, startPage: 69, endPage: 118 }, // Model for Change For Managers facilitator guide + role-play cards
  { outputPath: `${DOCS}/25c.pdf`, startPage: 151, endPage: 188 }, // Breakthrough participant workbook
])

// Doc 26: Remove sharpie cover (pp 1-2)
console.log('--- Doc 26: Clean up EDI press/case studies ---')
await splitPdf(`${DOCS}/SKM_300i25011008450.pdf`, [
  { outputPath: `${DOCS}/26.pdf`, startPage: 3, endPage: 22 }, // EDI Press, Conference & Case Study Materials
])

// Doc 27: Split into 27 (Deming letter), 27a (Art & Science workbook), 27b (EDI marketing)
// Remove sharpie covers (pp 1-2, 5-6), black dividers (pp 116-117), handwritten divider (pp 118-119)
console.log('--- Doc 27: Split into 27, 27a, 27b ---')
await splitPdf(`${DOCS}/SKM_300i25011008470.pdf`, [
  { outputPath: `${DOCS}/27.pdf`, startPage: 3, endPage: 3 },     // Deming letter to Judith (1 page)
  { outputPath: `${DOCS}/27a.pdf`, startPage: 7, endPage: 115 },  // The Art and Science of Leadership workbook
  { outputPath: `${DOCS}/27b.pdf`, startPage: 120, endPage: 162 }, // EDI marketing materials collection
])

console.log('Done!')
