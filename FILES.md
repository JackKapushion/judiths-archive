# How the Documents Got Here

How Judith's physical paper archive became a searchable, AI-powered website.

## Source Material

Judith's archive is decades of accumulated paper. Some documents are typed and cleanly formatted, others are handwritten, photocopied, or old dot matrix printouts. Before scanning, we sorted the paper into groups by topic, put a blank piece of printer paper with a sharpie title between each group, and fed the whole thing through a batch scanner. This produced about 28 large PDFs with multiple documents jumbled together in each one.

## Splitting

Claude read each raw scan file visually, identified where one document ended and the next began (using the sharpie pages as markers), and scripted the splits. `scripts/edit-pdfs.mjs` handles this using pdf-lib. Beyond splitting, it strips out the sharpie separator pages, blank pages, scan artifacts, and duplicates. Some documents spanned multiple scan batches and needed to be merged. Some had their pages scattered across different parts of a scan file and needed to be reassembled. This produced 75 individual PDFs in `public/documents/`.

The naming convention uses the scan batch number as the base and letter suffixes for splits: batch 3 becomes `3a.pdf` through `3g.pdf`, batch 4 becomes `4a.pdf` through `4m.pdf`. Documents that didn't need splitting kept their batch number: `14.pdf`, `17.pdf`, `28.pdf`.

## OCR

`scripts/process-pdfs.mjs` runs ocrmypdf on every PDF to add a searchable text layer. Quality varies a lot. Clean typed documents extract well. Handwritten notes, old photocopies, and faded printouts produce garbled text. Some pages read upside-down. This affects everything downstream.

## Outlines and Summaries

The raw PDFs had no useful metadata. Most didn't have real titles (just a sharpie label on the separator page), no tables of contents, no descriptions. To make the archive navigable, Claude read every document visually and produced a structured review for each one, stored in `functions/data/document-reviews.json`.

Each review includes a descriptive title, a summary explaining what the document is and why it exists, authorship info, a topic category, and a structured outline. The outline is a table of contents that Claude built by reading through the document: section titles, the page range each section covers (using PDF page numbers, not printed page numbers), and a short description of what's in each section.

These outlines and summaries are what make the site work. The homepage uses titles, summaries, and categories to display and organize the collection. The document viewer uses outlines as a navigable table of contents in the sidebar. The AI chat uses the full metadata index to decide which documents are relevant to a question, and the outlines to point users to specific sections.

## Text Extraction

`scripts/extract-text.mjs` extracts text from every page using pdfjs-dist, producing `functions/data/search-index.json`. This powers the full-text search engine in the AI chat.

`scripts/extract-positions.mjs` extracts text bounding box coordinates, producing per-document JSON files in `public/text-positions/`. This powers citation highlighting in the PDF viewer.

## Document Index

`functions/data/document-index.json` has metadata for all 75 documents in a flat format that gets embedded in the AI chat system prompt. Derived from the reviews.

## Verification and Corrections

With hundreds of outline sections across 75 documents, the page numbers needed to be verified. Claude's visual reading sometimes confused printed page numbers (the number on the page) with PDF page numbers (the page's actual position in the file).

`scripts/verify-outlines.mjs` automates this by extracting keywords from each section title and checking whether they appear on the claimed start page. It searches nearby pages for better matches and classifies each section as correct, mismatched, or unverifiable (due to garbled OCR or generic titles).

`scripts/fix-outlines.mjs` applies corrections that were manually verified by reading the actual page text. About 130 corrections were applied across 5 rounds. The PDFs were also optimized for web delivery, and a few lost pages in the process, requiring additional outline updates.

## Scripts

All in `scripts/`, all Node.js ESM (`.mjs`).

- **edit-pdfs.mjs**: Splits raw scan files into individual documents
- **process-pdfs.mjs**: Runs OCR on scanned PDFs
- **extract-text.mjs**: Extracts page text for search
- **extract-positions.mjs**: Extracts text coordinates for citation highlighting
- **verify-outlines.mjs**: Cross-checks outline page numbers against extracted text
- **fix-outlines.mjs**: Applies verified page number corrections
- **check-text.mjs**, **check-marked.mjs**: Debug utilities for inspecting specific pages during verification
