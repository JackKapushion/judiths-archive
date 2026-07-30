import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

const DOCS_DIR = 'public/documents'
const INDEX_PATH = 'functions/data/document-index.json'
const OUTPUT_PATH = 'functions/data/search-index.json'

async function extractText(pdfPath) {
  const data = new Uint8Array(await readFile(pdfPath))
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise

  const pages = []
  for (let i = 1; i <= doc.numPages; i++) {
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
  return { pages }
}

async function main() {
  const docIndex = JSON.parse(await readFile(INDEX_PATH, 'utf-8'))
  const filenames = docIndex.map((d) => d.filename)

  console.log(`Extracting text from ${filenames.length} documents...\n`)

  const searchIndex = {}
  let done = 0

  for (const filename of filenames) {
    const pdfPath = join(DOCS_DIR, filename)
    try {
      searchIndex[filename] = await extractText(pdfPath)
      done++
      const pageCount = searchIndex[filename].pages.length
      console.log(`[${done}/${filenames.length}] ${filename} - ${pageCount} pages`)
    } catch (err) {
      console.error(`[${done}/${filenames.length}] ${filename} - FAILED: ${err.message}`)
    }
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(searchIndex, null, 2))
  console.log(`\nDone. Wrote ${OUTPUT_PATH} (${Object.keys(searchIndex).length} documents)`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
