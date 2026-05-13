# Step 03: Homepage Redesign & PDF Processing

## Goal

Transform the homepage from a flat document list into a scrolling single-page experience with a hero, bio, sticky search bar, horizontal scroll sections, and a thumbnail-based document grid. Set up build-time scripts for PDF thumbnail generation and text extraction to support search and (eventually) AI RAG.

## Requirements

- Hero section with Judith's photo and a short description of the site
- Biography section
- Sticky search bar that pins below the header when scrolled past
- Recently Viewed as a horizontal scroll row (only visible when logged in with history)
- Favorites as a horizontal scroll row (only visible when logged in with favorites)
- All Documents as a thumbnail card grid (flat for now - categories added later when PDFs are split)
- Build-time thumbnail generation (page 1 of each PDF rendered as PNG)
- Build-time text extraction (all PDF text dumped to a JSON file for search)
- Search filters documents by title initially, full-text search enabled once text extraction output exists

## Prerequisites (Jack does these manually)

### 1. Judith's photo

Already copied to `public/images/judith.png` (done).

### 3. Biography text

Placeholder biography from `my-notes/todo.md` - Claude Code will hardcode it into the bio component. Jack can revise the text in the component anytime.

### 4. Run PDF processing (after Claude Code creates the script)

```bash
npm run process-pdfs
```

This generates thumbnails and extracts text via OCR in one pass. Only processes PDFs that haven't been processed yet. Note: OCR on 27 PDFs (some with 200+ pages) will take a while on the first run.

### Important: PDF text extraction requires OCR

These PDFs have **no text layer** - the scanner (Konica Minolta bizhub 300i) created them as pure images (a grayscale background + a 1-bit text-shaped mask). The text you can select in macOS Preview is generated on-the-fly by Apple's Live Text OCR, not from the PDF itself.

This means `pdfjs-dist` `getTextContent()` and `pdftotext` both return zero text. Confirmed directly. The text extraction step must render each page to an image and run Tesseract OCR on it.

---

## Step-by-Step Implementation Plan (Claude Code)

### 1. PDF processing script

Create `scripts/process-pdfs.mjs`:

A single Node script that does both thumbnail generation and OCR text extraction. For each PDF in `public/documents/`:

**Thumbnails** (using `pdfjs-dist` + `@napi-rs/canvas`):
- Render page 1 to a canvas using pdfjs, scaled to 400px width
- Save as PNG to `public/thumbnails/` (filename matches PDF, e.g., `SKM_300i24061408380.png`)
- Skip if thumbnail already exists (only generates missing ones)

**Text extraction** (using `pdfjs-dist` + `@napi-rs/canvas` for rendering, then system `tesseract` for OCR):
- For each page: render to a temporary PNG via pdfjs canvas, run `tesseract` on it, collect the text
- Clean up temp images after OCR
- Output to `public/search-index.json` with structure:

```json
{
  "SKM_300i24061408380.pdf": {
    "pages": [
      { "page": 1, "text": "CHOICES: MBL..." },
      { "page": 2, "text": "..." }
    ],
    "fullText": "all pages concatenated"
  }
}
```

- Keyed by filename so the app can match it to the documents array
- Stored in `public/` so it's fetched on demand (not bundled into the app)
- Skips PDFs already in the index (only processes new ones)

**npm scripts:**
- `"process-pdfs": "node scripts/process-pdfs.mjs"` - runs both
- To force regenerate everything: delete `public/thumbnails/` and `public/search-index.json`, then run again

**gitignore:** Add `public/thumbnails/` and `public/search-index.json` (generated files, not tracked)

### 2. Update document model

In `src/lib/documents.ts`:

- Add a helper function `getThumbnailPath(doc)` that returns:
  - For PDFs: `/thumbnails/${filename without extension}.png`
  - For images: `/documents/${filename}` (the image itself is the thumbnail)

### 3. Restructure Layout for full-width hero

Currently `src/components/layout/layout.tsx` wraps all content in `max-w-5xl`. The hero needs to be full-width while the rest of the content stays contained.

- Remove the `max-w-5xl` and `px-4 py-6` from the `<main>` wrapper in Layout
- Let individual pages control their own width constraints
- The Viewer page will add its own `max-w-5xl mx-auto px-4 py-6` wrapper

### 4. Hero section component

Create `src/components/home/hero.tsx`:

- Full-width section with a muted background color
- Judith's photo (from `/images/judith.png`), displayed as a centered circular or rounded portrait
- Site title: "Judith Orloff's Archive" or similar
- One or two sentences describing what the site is and what it contains
- Visually distinct from the rest of the page - this is the first thing people see

### 5. Bio section component

Create `src/components/home/bio.tsx`:

- Contained width section (`max-w-3xl` or similar for readable line lengths)
- Short biography text provided by Jack in prerequisite 3
- Simple, clean typography

### 6. Sticky search bar component

Create `src/components/home/search-bar.tsx`:

- Text input with a search icon
- Uses `position: sticky` with `top` set to stick just below the header (56px based on current `h-14` header)
- Gets a background color and subtle shadow when stuck (use an `IntersectionObserver` on a sentinel element to detect when it's stuck)
- Accepts an `onSearch` callback that passes the current query string to the parent
- The parent (Home page) handles filtering logic

### 7. Document thumbnail card component

Create `src/components/home/document-card.tsx`:

- Extract and redesign the existing `DocumentCard` from `src/pages/home.tsx`
- Shows the PDF thumbnail image (from `getThumbnailPath`)
- Falls back to a plain placeholder (e.g., document icon or styled div with the title) when the thumbnail file hasn't been generated yet
- Document title below the thumbnail
- Favorite button (heart) overlaid on the card or below the title
- Links to `/read/:docId`
- Sized for a grid layout (consistent aspect ratio on the thumbnail)

### 8. Horizontal scroll section component

Create `src/components/home/horizontal-section.tsx`:

- Reusable component for Recently Viewed and Favorites
- Takes a title and array of documents
- Renders document cards in a horizontal row with `overflow-x-auto` and `flex-nowrap`
- Cards have a fixed width in this layout so they don't stretch
- Scroll snap for clean stopping points on mobile
- Only renders if the document array is non-empty

### 9. Redesign home page

Rewrite `src/pages/home.tsx` to compose all the new sections:

```
<Hero />
<Bio />
<SearchBar onSearch={setQuery} />
<div className="max-w-6xl mx-auto px-4">
  {user && recentDocs.length > 0 && (
    <HorizontalSection title="Recently Viewed" docs={recentDocs} />
  )}
  {user && favoriteDocs.length > 0 && (
    <HorizontalSection title="Favorites" docs={favoriteDocs} />
  )}
  <section>
    <h2>All Documents</h2>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {filteredDocs.map(doc => <DocumentCard ... />)}
    </div>
  </section>
</div>
```

- `filteredDocs` is the documents array filtered by the search query (title match for now)
- When search is active, hide Recently Viewed and Favorites (just show results)
- No categories yet - flat grid under "All Documents"

### 10. Search filtering logic

In `src/pages/home.tsx`:

- Simple state: `query` string from the search bar
- Filter `documents` array by checking if `doc.title.toLowerCase()` includes `query.toLowerCase()`
- Later, when `search-index.json` exists, enhance to also search full text:
  - Lazy-load `search-index.json` on first search interaction
  - Match query against `fullText` for each document
  - Show which documents matched and optionally highlight the matching context
- For now, just title filtering - silently title-only, no "coming soon" messaging

### 11. Update Viewer page wrapper

Since Layout no longer provides padding/max-width, update `src/pages/viewer.tsx`:

- Wrap the viewer content in `max-w-5xl mx-auto px-4 py-6` to maintain its current layout

### 12. Add generated files to .gitignore

Add to `.gitignore`:

```
public/thumbnails/
public/search-index.json
```
