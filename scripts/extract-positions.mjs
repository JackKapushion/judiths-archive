// Extracts text content + positions from PDFs using pdfjs-dist's getTextContent().
// Produces per-document JSON files with bounding box data for every text item.
//
// This is the "pre-computed metadata" approach used by PAWLS (Allen AI),
// Semantic Scholar, and Google's PDF processing. By extracting positions at
// build time, the viewer can instantly highlight citations and search results
// without waiting for pdfjs to render text layer DOM.
//
// Usage:
//   node scripts/extract-positions.mjs              # all documents
//   node scripts/extract-positions.mjs 12a          # single document
//   node scripts/extract-positions.mjs 12a 13 15    # specific documents

import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

const DOCS_DIR = 'public/documents'
const OUTPUT_DIR = 'public/text-positions'
const INDEX_PATH = 'functions/data/document-index.json'

// Combines two 2D transformation matrices (same as PDF.js Util.transform).
// Used to compute viewport × item.transform, giving screen-space coordinates.
function combineTx(m1, m2) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ]
}

async function extractPositions(pdfPath) {
  const data = new Uint8Array(await readFile(pdfPath))
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise

  const pages = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: 1.0 })
    const content = await page.getTextContent()

    // CRITICAL: Use the SAME coordinate system as PDF.js TextLayer.
    // In pdfjs-dist 5.x, the TextLayer uses viewport.rawDims (unrotated
    // page dimensions) with a simple Y-flip transform, NOT the full
    // viewport.transform that includes rotation. CSS handles the visual
    // rotation via data-main-rotation + a CSS rotate() transform.
    //
    // If we used viewport.transform (which includes rotation), our
    // coordinates would be in a different space than the text layer,
    // and highlights would be offset on rotated pages. By matching the
    // text layer's coordinate system, our highlights can be placed inside
    // the text layer div and inherit its CSS rotation automatically.
    const { pageWidth, pageHeight, pageX, pageY } = viewport.rawDims
    const textLayerTx = [1, 0, 0, -1, -pageX, pageY + pageHeight]

    // For rotated pages (90/270), the text matrix has swapped axes: the
    // horizontal font scale (fontWidthScale) is much smaller than the
    // vertical (fontHeight). getTextContent's item.width represents the
    // advance width through this compressed transform, but the PDF's
    // embedded font glyphs render at proportions matching fontHeight.
    // We correct by scaling item.width by fontHeight/fontWidthScale.
    // Non-rotated pages have fontWidthScale >= fontHeight, so no correction
    // is needed (the advance width IS the visual width).
    const isAxisSwapped = page.rotate === 90 || page.rotate === 270

    const items = content.items
      .filter(item => 'str' in item && item.str.length > 0)
      .map(item => {
        // Combine the text layer transform with the item transform.
        // This matches PDF.js TextLayer's #appendText method exactly:
        // it uses Util.transform(this.#transform, geom.transform) where
        // this.#transform = [1, 0, 0, -1, -pageX, pageY + pageHeight].
        const tx = combineTx(textLayerTx, item.transform)

        // Font height: magnitude of the y-axis component of the combined
        // transform. Same calculation as PDF.js TextLayer.
        const fontHeight = Math.hypot(tx[2], tx[3])

        // Font width scale: magnitude of the x-axis component. Used for
        // width correction on rotated pages.
        const fontWidthScale = Math.hypot(tx[0], tx[1])

        // tx[4] = left position, tx[5] = baseline y position (in the
        // text layer's coordinate system). Top of text = baseline - fontHeight.
        //
        // Width: for rotated pages, item.width is the advance through a
        // compressed transform and doesn't match the visual width. We
        // correct by the fontHeight/fontWidthScale ratio, which undoes
        // the axis compression. For non-rotated pages, item.width is
        // already correct.
        const w = (isAxisSwapped && fontWidthScale > 0)
          ? item.width * fontHeight / fontWidthScale
          : item.width

        return {
          str: item.str,
          x: round2(tx[4]),
          y: round2(tx[5] - fontHeight),
          w: round2(w),
          h: round2(fontHeight),
        }
      })

    pages.push({
      page: i,
      // Raw page dimensions (unrotated), matching the text layer's
      // coordinate system. The viewer uses these as the percentage
      // basis for positioning highlights inside the text layer div.
      pageWidth: round2(pageWidth),
      pageHeight: round2(pageHeight),
      items,
    })
  }

  await doc.destroy()
  return { pages }
}

function round2(n) {
  return Math.round(n * 100) / 100
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const args = process.argv.slice(2)
  let docIds

  if (args.length > 0) {
    docIds = args
  } else {
    const docIndex = JSON.parse(await readFile(INDEX_PATH, 'utf-8'))
    docIds = docIndex.map(d => d.id)
  }

  console.log(`Extracting text positions from ${docIds.length} document(s)...\n`)

  let done = 0
  for (const docId of docIds) {
    const filename = `${docId}.pdf`
    const pdfPath = join(DOCS_DIR, filename)
    const outputPath = join(OUTPUT_DIR, `${docId}.json`)

    try {
      const result = await extractPositions(pdfPath)
      await writeFile(outputPath, JSON.stringify(result))

      done++
      const totalItems = result.pages.reduce((sum, p) => sum + p.items.length, 0)
      console.log(`[${done}/${docIds.length}] ${docId} - ${result.pages.length} pages, ${totalItems} text items`)
    } catch (err) {
      console.error(`[${done + 1}/${docIds.length}] ${docId} - FAILED: ${err.message}`)
      done++
    }
  }

  console.log(`\nDone. Output in ${OUTPUT_DIR}/`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
