import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

const DOCS_DIR = 'public/documents'
const THUMBNAILS_DIR = 'public/thumbnails'
const SEARCH_INDEX_PATH = 'public/search-index.json'

// Step 1: Run ocrmypdf to add text layer to a PDF
function ocrPdf(pdfPath) {
  try {
    // --skip-text avoids re-processing PDFs that already have a text layer
    execSync(`ocrmypdf --skip-text "${pdfPath}" "${pdfPath}"`, {
      stdio: 'pipe',
      timeout: 600000, // 10 min per PDF
    })
    return true
  } catch (err) {
    const stderr = err.stderr?.toString() || ''
    if (stderr.includes('page already has text')) {
      return 'skipped'
    }
    throw err
  }
}

// Step 2: Generate a thumbnail from page 1 using ghostscript
function generateThumbnail(pdfPath, outputPath) {
  execSync(
    `gs -dNOPAUSE -dBATCH -dQUIET -dFirstPage=1 -dLastPage=1 -sDEVICE=png16m -r72 -sOutputFile="${outputPath}" "${pdfPath}"`,
    { stdio: 'pipe' }
  )
}

// Step 3: Extract text from the now-searchable PDF using pdfjs
async function extractText(pdfPath) {
  const data = new Uint8Array(await readFile(pdfPath))
  const doc = await pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
  }).promise

  const numPages = doc.numPages
  const pages = []

  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .filter((item) => 'str' in item)
      .map((item) => item.str)
      .join(' ')
      .trim()
    pages.push({ page: i, text })
  }

  await doc.destroy()

  const fullText = pages.map((p) => p.text).join('\n\n')
  return { pages, fullText }
}

async function main() {
  if (!existsSync(THUMBNAILS_DIR)) await mkdir(THUMBNAILS_DIR, { recursive: true })

  // Load existing search index
  let searchIndex = {}
  if (existsSync(SEARCH_INDEX_PATH)) {
    searchIndex = JSON.parse(await readFile(SEARCH_INDEX_PATH, 'utf-8'))
  }

  const files = await readdir(DOCS_DIR)
  const pdfs = files.filter((f) => f.toLowerCase().endsWith('.pdf'))

  console.log(`Found ${pdfs.length} PDFs in ${DOCS_DIR}\n`)

  for (const pdf of pdfs) {
    const pdfPath = join(DOCS_DIR, pdf)
    const thumbName = pdf.replace(/\.pdf$/i, '.png')
    const thumbPath = join(THUMBNAILS_DIR, thumbName)

    // OCR
    console.log(`[ocr]   ${pdf}`)
    try {
      const result = ocrPdf(pdfPath)
      console.log(`[ocr]   ${pdf} - ${result === 'skipped' ? 'already has text, skipped' : 'done'}`)
    } catch (err) {
      console.error(`[ocr]   ${pdf} - FAILED: ${err.message}`)
      continue // skip thumbnail + text extraction if OCR fails
    }

    // Thumbnail
    if (existsSync(thumbPath)) {
      console.log(`[thumb] ${pdf} - already exists, skipping`)
    } else {
      console.log(`[thumb] ${pdf} - generating...`)
      try {
        generateThumbnail(pdfPath, thumbPath)
        console.log(`[thumb] ${pdf} - done`)
      } catch (err) {
        console.error(`[thumb] ${pdf} - FAILED: ${err.message}`)
      }
    }

    // Text extraction
    if (searchIndex[pdf]) {
      console.log(`[text]  ${pdf} - already indexed, skipping`)
    } else {
      console.log(`[text]  ${pdf} - extracting...`)
      try {
        searchIndex[pdf] = await extractText(pdfPath)
        await writeFile(SEARCH_INDEX_PATH, JSON.stringify(searchIndex, null, 2))
        console.log(`[text]  ${pdf} - done (${searchIndex[pdf].pages.length} pages)`)
      } catch (err) {
        console.error(`[text]  ${pdf} - FAILED: ${err.message}`)
      }
    }

    console.log()
  }

  console.log('Done!')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
