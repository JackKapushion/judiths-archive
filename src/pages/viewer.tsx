import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { getDocumentById } from '../lib/documents'
import { NotFound } from '../App'
import { useAuth } from '../components/auth/auth-context'
import { useAuthGate } from '../components/auth/use-auth-gate'
import {
  getUserData,
  toggleFavorite,
  updateProgress,
  addRecentlyViewed,
  isFavorite,
} from '../lib/user-data'
import { getDocumentOutline, getFirstPage } from '../lib/document-outlines'

// --- PDF Text Highlighting: Hybrid Approach ---
//
// SEARCH: Pre-computed text positions (from scripts/extract-positions.mjs)
// provide instant full-document search. The JSON stores text + bounding
// boxes for gap detection (inserting spaces between items). Search uses
// findAllPrecomputedMatches for the match count and page numbers.
//
// RENDERING: All highlight positioning uses span-based highlighting.
// We set backgroundColor directly on the text layer's <span> elements,
// which pdfjs already positions correctly for all page rotations via
// CSS transforms. This avoids Range.getClientRects(), which returns
// pre-transform dimensions inside CSS-rotated containers (e.g., 3px-wide
// rects for characters that visually appear 15px wide on rotation=270).
//
// FALLBACK: Documents without pre-computed data (JSON 404) fall back
// to DOM-based search too (only searches rendered pages).

interface TextNodeInfo {
  node: Text
  start: number // character offset in concatenated page text
  end: number
}

interface PageTextContent {
  text: string
  nodes: TextNodeInfo[]
}

interface SearchMatch {
  pageNum: number
  start: number // character offset in page text
  end: number
}

// --- Pre-computed text position data (from scripts/extract-positions.mjs) ---
// Used for instant text search across all pages. Coordinates are stored
// for gap detection (inserting spaces between items) but NOT for highlight
// positioning. Positioning is handled by styling the text layer spans
// directly, which correctly handles all page rotations via CSS transforms.

interface PrecomputedItem {
  str: string
  x: number  // position (used for gap detection between items)
  y: number
  w: number
  h: number
}

interface PrecomputedPage {
  page: number
  pageWidth: number
  pageHeight: number
  items: PrecomputedItem[]
}

interface PrecomputedData {
  pages: PrecomputedPage[]
}

// Fetches pre-computed text positions for a document. Returns null if
// the JSON doesn't exist (document hasn't been processed yet).
async function fetchTextPositions(docId: string): Promise<PrecomputedData | null> {
  try {
    const resp = await fetch(`/text-positions/${docId}.json`)
    if (!resp.ok) return null
    return await resp.json()
  } catch {
    return null
  }
}

// Concatenates all item strings for a page into a single searchable
// text string. Inserts a space between items that have a position gap
// (word breaks). Without spaces, multi-word searches like "Natural
// Leadership" fail because items concatenate as "NaturalLeadership".
// The gap threshold (0.3x font height) catches normal word spaces
// while ignoring sub-character kerning adjustments.
function getPrecomputedPageText(page: PrecomputedPage): { text: string } {
  let text = ''
  for (let i = 0; i < page.items.length; i++) {
    const item = page.items[i]
    if (i > 0) {
      const prev = page.items[i - 1]
      const prevEnd = prev.x + prev.w
      const gap = item.x - prevEnd
      const sameLine = Math.abs(item.y - prev.y) < item.h
      if (!sameLine || gap > item.h * 0.3) {
        text += ' '
      }
    }
    text += item.str
  }
  return { text }
}

// Search all pages using pre-computed data. Returns matches with page
// numbers and character offsets, same as findAllSearchMatches but
// without needing the DOM text layer to be rendered.
function findAllPrecomputedMatches(
  data: PrecomputedData,
  query: string,
): SearchMatch[] {
  if (!query.trim()) return []
  const matches: SearchMatch[] = []
  const qLower = query.toLowerCase()

  for (const page of data.pages) {
    const { text } = getPrecomputedPageText(page)
    const textLower = text.toLowerCase()
    let from = 0
    while (true) {
      const idx = textLower.indexOf(qLower, from)
      if (idx === -1) break
      matches.push({ pageNum: page.page, start: idx, end: idx + query.length })
      from = idx + 1
    }
  }
  return matches
}

// --- Text extraction (DOM-based fallback) ---

// Extracts all text from a page's text layer using a DOM TreeWalker.
// createNodeIterator with SHOW_TEXT visits only Text nodes, which means
// react-pdf's markedContent wrapper spans (which contain child spans but
// no direct text) are invisible to the iteration. We get exactly the
// leaf text nodes with the actual character content.
//
// Returns the concatenated text plus a mapping from character offsets
// back to the source DOM text nodes (needed to identify spans later).
function getPageTextContent(pageEl: HTMLElement): PageTextContent | null {
  const textLayer = pageEl.querySelector('.react-pdf__Page__textContent')
  if (!textLayer) return null

  const iterator = document.createNodeIterator(textLayer, NodeFilter.SHOW_TEXT)
  const nodes: TextNodeInfo[] = []
  let text = ''
  let node: Text | null

  while ((node = iterator.nextNode() as Text | null)) {
    const content = node.textContent || ''
    if (content.length === 0) continue
    nodes.push({ node, start: text.length, end: text.length + content.length })
    text += content
  }

  return nodes.length > 0 ? { text, nodes } : null
}

// --- CSS Highlight API ---
//
// Uses the browser's native CSS Highlight API (::highlight pseudo-element)
// to render highlights. The browser handles all CSS transform math
// internally, so highlights appear correctly on rotated pages.
//
// Previous approaches (overlay divs via getClientRects, span backgroundColor)
// both fail on rotated pages because they operate in pre-transform space.
// The CSS Highlight API avoids this entirely by letting the browser's
// own text rendering pipeline handle the visual positioning.

// Converts character offsets in concatenated page text into a DOM Range.
// Walks the text node mapping to find which nodes contain the start and
// end positions, then creates a Range spanning between them.
function resolveRange(nodes: TextNodeInfo[], startOffset: number, endOffset: number): Range | null {
  let startNode: Text | null = null
  let startLocal = 0
  let endNode: Text | null = null
  let endLocal = 0

  for (const { node, start, end } of nodes) {
    if (!startNode && startOffset < end) {
      startNode = node
      startLocal = startOffset - start
    }
    if (endOffset <= end) {
      endNode = node
      endLocal = endOffset - start
      break
    }
  }

  if (!startNode || !endNode) return null

  const range = document.createRange()
  range.setStart(startNode, startLocal)
  range.setEnd(endNode, endLocal)
  return range
}

// Clears all CSS search highlights.
function clearAllCSSHighlights(): void {
  if (!CSS.highlights) return
  CSS.highlights.delete('search-active')
  CSS.highlights.delete('search-inactive')
}

// --- Search across all pages ---

// Finds all occurrences of a query across all rendered pages using
// case-insensitive exact matching. Returns matches with page numbers
// and character offsets for highlighting and navigation.
function findAllSearchMatches(
  pageRefs: Map<number, HTMLDivElement>,
  numPages: number,
  query: string,
): SearchMatch[] {
  if (!query.trim()) return []
  const matches: SearchMatch[] = []
  const qLower = query.toLowerCase()

  for (let p = 1; p <= numPages; p++) {
    const el = pageRefs.get(p)
    if (!el) continue
    const content = getPageTextContent(el)
    if (!content) continue

    const textLower = content.text.toLowerCase()
    let from = 0
    while (true) {
      const idx = textLower.indexOf(qLower, from)
      if (idx === -1) break
      matches.push({ pageNum: p, start: idx, end: idx + query.length })
      from = idx + 1
    }
  }
  return matches
}

export function Viewer() {
  const { docId } = useParams<{ docId: string }>()
  const [searchParams] = useSearchParams()
  const doc = docId ? getDocumentById(docId) : undefined
  const { user } = useAuth()
  const authGate = useAuthGate()
  const outline = useMemo(() => (docId ? getDocumentOutline(docId) : []), [docId])

  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [isFav, setIsFav] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  // Custom Cmd+F search state. Chrome's native find can't search pdfjs
  // text layers, so we intercept Cmd+F and provide our own search.
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([])
  const [currentMatchIdx, setCurrentMatchIdx] = useState(-1)
  // Track scroll container width so mobile can use the width prop
  // on <Page> for fit-to-width rendering. At scale=1.0 (100%),
  // the page fills the screen perfectly. Zooming scales from there.
  const [containerWidth, setContainerWidth] = useState(0)
  // Pre-computed text position data (from public/text-positions/{docId}.json).
  // When available, used for both citation highlights and Cmd+F search
  // instead of waiting for pdfjs text layer DOM rendering.
  const [textPositions, setTextPositions] = useState<PrecomputedData | null>(null)
  // Base page dimensions at scale 1.0, fetched from PDF metadata on load.
  // Used for virtualization placeholder sizing so off-screen pages maintain
  // correct heights without rendering their canvas.
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }[] | null>(null)
  // Which pages have their <Page> component mounted. Pages outside this
  // set render as empty placeholder divs with correct dimensions.
  // Managed by IntersectionObserver to keep only ~6-8 canvases alive,
  // bounding GPU memory so large documents don't crash on zoom.
  const [renderablePages, setRenderablePages] = useState<Set<number>>(new Set())

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const progressTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const initialPageRef = useRef(1)
  const progressBarRef = useRef<HTMLDivElement>(null)
  // Track latest values in refs so the unmount cleanup can flush
  // the debounced progress save with the correct page position.
  const latestPageRef = useRef(1)
  const latestTotalRef = useRef(0)
  // Track current scale in a ref so gesture event handlers always
  // have the latest value without stale closures in the useEffect.
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  // Ref for the pages container div, used to apply CSS transform
  // during pinch-to-zoom for smooth 60fps visual feedback.
  const pagesContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // URL ?page= param takes priority over saved reading progress
  const urlPage = searchParams.get('page')
  const urlPageNum = urlPage ? parseInt(urlPage.split('-')[0], 10) : null
  const hasUrlPage = useRef(false)

  // Reset when navigating to a different document
  useEffect(() => {
    pageRefs.current.clear()
    setNumPages(0)
    setCurrentPage(1)
    setScrollProgress(0)
    setScale(1.0)
    setSidebarOpen(false)
    setSearchOpen(false)
    setSearchQuery('')
    setSearchMatches([])
    setCurrentMatchIdx(-1)
    // Reset virtualization state so the new document starts fresh
    setPageDimensions(null)
    setRenderablePages(new Set())
    hasUrlPage.current = urlPageNum !== null && !isNaN(urlPageNum)
    initialPageRef.current = hasUrlPage.current ? urlPageNum! : 1
  }, [docId])

  // Load user data: favorites + reading progress.
  // URL ?page= param takes priority over saved progress.
  useEffect(() => {
    if (!user || !docId) return
    getUserData(user.uid).then((data) => {
      setIsFav(isFavorite(data, docId))
      if (!hasUrlPage.current) {
        const progress = data.progress[docId]
        if (progress?.currentPage) {
          initialPageRef.current = progress.currentPage
        }
      }
    })
    addRecentlyViewed(user.uid, docId).catch(console.error)
  }, [user, docId])

  // Fetch pre-computed text positions. Fires once per document. If the
  // JSON doesn't exist (404), textPositions stays null and Cmd+F search
  // falls back to DOM-based matching (only searches rendered pages).
  useEffect(() => {
    if (!docId) return
    setTextPositions(null)
    fetchTextPositions(docId).then(setTextPositions)
  }, [docId])

  // Scroll to the target page once PDF pages render.
  // Citation links from AI chat use ?page= to navigate directly.
  const handlePdfLoad = useCallback((pdf: any) => {
    const n = pdf.numPages
    setNumPages(n)

    // Fetch base page dimensions from PDF metadata for placeholder sizing.
    // Just reads page tree entries (no canvas work), fast even for 100+ pages.
    if (pdf.getPage) {
      Promise.all(
        Array.from({ length: n }, (_, i) =>
          pdf.getPage(i + 1).then((page: any) => {
            const vp = page.getViewport({ scale: 1 })
            return { width: vp.width, height: vp.height }
          })
        )
      ).then(setPageDimensions).catch(() => {})
    }

    const targetPage = initialPageRef.current

    // Initialize renderable pages: only mount <Page> for a small window
    // around the target. The IntersectionObserver (below) takes over from
    // here, adding/removing pages as the user scrolls.
    const initialPages = new Set<number>()
    for (let p = Math.max(1, targetPage - 2); p <= Math.min(targetPage + 5, n); p++) {
      initialPages.add(p)
    }
    setRenderablePages(initialPages)

    // Scroll to the target page
    if (targetPage > 1) {
      let attempts = 0
      const tryScroll = () => {
        const el = pageRefs.current.get(targetPage)
        const container = scrollContainerRef.current
        if (el && el.offsetHeight > 0 && container) {
          container.scrollTo({ top: el.offsetTop - 12, behavior: 'instant' })
        } else if (attempts < 30) {
          attempts++
          requestAnimationFrame(tryScroll)
        }
      }
      requestAnimationFrame(tryScroll)
    }
  }, [])

  // Save progress (debounced). The 2-second delay avoids hammering
  // Firestore on every scroll tick, but we flush immediately on
  // unmount (below) so progress is saved before navigating away.
  const saveProgress = useCallback(
    (page: number, total: number) => {
      if (!user || !docId) return
      latestPageRef.current = page
      latestTotalRef.current = total
      clearTimeout(progressTimer.current)
      progressTimer.current = setTimeout(() => {
        updateProgress(user.uid, docId, page, total)
      }, 2000)
    },
    [user, docId],
  )

  useEffect(() => {
    if (currentPage > 0 && numPages > 0) {
      saveProgress(currentPage, numPages)
    }
  }, [currentPage, numPages, saveProgress])

  // Flush any pending debounced save immediately when leaving the viewer,
  // so the home page sees up-to-date progress without waiting for the timer.
  useEffect(() => {
    return () => {
      clearTimeout(progressTimer.current)
      if (user && docId && latestPageRef.current > 0 && latestTotalRef.current > 0) {
        updateProgress(user.uid, docId, latestPageRef.current, latestTotalRef.current)
      }
    }
  }, [user, docId])

  // Scroll handler: updates progress bar and current page
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || numPages === 0) return

    const maxScroll = container.scrollHeight - container.clientHeight
    if (maxScroll > 0) {
      setScrollProgress(container.scrollTop / maxScroll)
    }

    // Find current page by iterating backwards: the first page (from the
    // bottom) whose top edge is above the 30% threshold is the current page.
    // Breaks on first match instead of scanning all pages, so scrolling is
    // O(1) in the common case (sequential reading) instead of O(numPages).
    const threshold =
      container.getBoundingClientRect().top + container.clientHeight * 0.3
    let current = 1
    for (let i = numPages; i >= 1; i--) {
      const el = pageRefs.current.get(i)
      if (el && el.getBoundingClientRect().top <= threshold) {
        current = i
        break
      }
    }
    setCurrentPage(current)
  }, [numPages])

  // Measure scroll container width for mobile fit-to-width rendering.
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const update = () => setContainerWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Page virtualization: only mount <Page> components for pages near the
  // viewport. Each <Page> renders a canvas that consumes GPU memory
  // proportional to (pageWidth * scale * devicePixelRatio)^2. For an
  // 80-page doc at 150% zoom on a 2x display, that's ~17MB per page.
  // Rendering all 80 = 1.4GB, which exceeds Safari's canvas memory
  // limit and crashes the tab. This observer keeps ~6-8 pages mounted,
  // bounding memory to ~100-140MB regardless of document length or zoom.
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || numPages === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        setRenderablePages(prev => {
          const next = new Set(prev)
          let changed = false
          for (const entry of entries) {
            const page = Number((entry.target as HTMLElement).dataset.page)
            if (!page) continue
            if (entry.isIntersecting) {
              if (!next.has(page)) { next.add(page); changed = true }
            } else {
              if (next.has(page)) { next.delete(page); changed = true }
            }
          }
          return changed ? next : prev
        })
      },
      {
        root: container,
        // Buffer: render pages within 100% of viewport height above and
        // below. At typical page sizes this gives ~2-3 pages of buffer
        // in each direction, keeping total canvases around 6-8.
        rootMargin: '100% 0px',
      }
    )

    // Wait one frame for React to commit page wrapper divs to the DOM
    requestAnimationFrame(() => {
      for (let p = 1; p <= numPages; p++) {
        const el = pageRefs.current.get(p)
        if (el) observer.observe(el)
      }
    })

    return () => observer.disconnect()
  }, [numPages])

  // Pinch-to-zoom: intercept pinch gestures to control PDF zoom
  // instead of the browser zooming the entire page.
  //
  // Uses CSS transform during the gesture for smooth 60fps feedback
  // (GPU-accelerated, no react-pdf re-render). Only triggers an actual
  // PDF re-render when fingers lift. Without this, every gesture tick
  // re-renders ALL page canvases which causes visible stepping/choppiness.
  //
  // Safari and Chrome on iOS (WebKit-based) support gesture events
  // natively. Other browsers fall back to two-finger touch distance.
  useEffect(() => {
    const el = scrollContainerRef.current
    // Only need the scroll container at setup time (for event listeners).
    // pagesContainerRef.current is read inside handlers at event time,
    // because it's null on mount (the div is inside <Document> which
    // only renders children after the PDF loads).
    if (!el) return

    let startScale = 1
    let lastGestureScale = 1
    const supportsGesture = 'GestureEvent' in window

    // Compute transform-origin relative to the user's current viewport
    // center, so zoom appears anchored on what they're looking at.
    function setOriginToViewportCenter() {
      const pagesEl = pagesContainerRef.current
      if (!pagesEl) return
      const viewportCenterY = el!.scrollTop + el!.clientHeight / 2
      pagesEl.style.transformOrigin = `center ${viewportCenterY}px`
    }

    if (supportsGesture) {
      const onGestureStart = (e: Event) => {
        e.preventDefault()
        if (!pagesContainerRef.current) return
        startScale = scaleRef.current
        lastGestureScale = 1
        setOriginToViewportCenter()
        pagesContainerRef.current.style.willChange = 'transform'
      }
      const onGestureChange = (e: Event) => {
        e.preventDefault()
        if (!pagesContainerRef.current) return
        lastGestureScale = (e as any).scale as number
        // CSS transform for instant visual zoom (no layout/canvas work)
        pagesContainerRef.current.style.transform = `scale(${lastGestureScale})`
      }
      const onGestureEnd = (e: Event) => {
        e.preventDefault()
        const pagesEl = pagesContainerRef.current
        if (!pagesEl) return
        // One step (50%) in the pinch direction. Never skip levels.
        const direction = lastGestureScale > 1 ? 0.5 : lastGestureScale < 1 ? -0.5 : 0
        const finalScale = Math.max(0.5, Math.min(2.5, startScale + direction))
        // Remove visual transform and re-render PDF at final resolution
        pagesEl.style.transform = ''
        pagesEl.style.willChange = ''
        pagesEl.style.transformOrigin = ''
        setScale(finalScale)
      }

      el.addEventListener('gesturestart', onGestureStart, { passive: false })
      el.addEventListener('gesturechange', onGestureChange, { passive: false })
      el.addEventListener('gestureend', onGestureEnd, { passive: false })

      return () => {
        el.removeEventListener('gesturestart', onGestureStart)
        el.removeEventListener('gesturechange', onGestureChange)
        el.removeEventListener('gestureend', onGestureEnd)
      }
    } else {
      // Fallback: track two-finger touch distance for pinch detection.
      // Same CSS transform approach for smooth visual feedback.
      let initialDistance = 0
      let lastRatio = 1

      const getDistance = (t1: Touch, t2: Touch) => {
        const dx = t1.clientX - t2.clientX
        const dy = t1.clientY - t2.clientY
        return Math.sqrt(dx * dx + dy * dy)
      }

      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          initialDistance = getDistance(e.touches[0], e.touches[1])
          startScale = scaleRef.current
          lastRatio = 1
          setOriginToViewportCenter()
          if (pagesContainerRef.current) {
            pagesContainerRef.current.style.willChange = 'transform'
          }
        }
      }

      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2 && initialDistance > 0) {
          e.preventDefault()
          const distance = getDistance(e.touches[0], e.touches[1])
          lastRatio = distance / initialDistance
          if (pagesContainerRef.current) {
            pagesContainerRef.current.style.transform = `scale(${lastRatio})`
          }
        }
      }

      const onTouchEnd = () => {
        if (initialDistance > 0) {
          const pagesEl = pagesContainerRef.current
          if (pagesEl) {
            // One step (50%) in the pinch direction. Never skip levels.
            const direction = lastRatio > 1 ? 0.5 : lastRatio < 1 ? -0.5 : 0
            const finalScale = Math.max(0.5, Math.min(2.5, startScale + direction))
            pagesEl.style.transform = ''
            pagesEl.style.willChange = ''
            pagesEl.style.transformOrigin = ''
            setScale(finalScale)
          }
          initialDistance = 0
        }
      }

      el.addEventListener('touchstart', onTouchStart, { passive: true })
      el.addEventListener('touchmove', onTouchMove, { passive: false })
      el.addEventListener('touchend', onTouchEnd)

      return () => {
        el.removeEventListener('touchstart', onTouchStart)
        el.removeEventListener('touchmove', onTouchMove)
        el.removeEventListener('touchend', onTouchEnd)
      }
    }
  }, [])

  const scrollToPage = useCallback((pageNum: number) => {
    const el = pageRefs.current.get(pageNum)
    const container = scrollContainerRef.current
    if (!el || !container) return

    // Calculate scroll position manually instead of using scrollIntoView.
    // scrollIntoView can land in the wrong spot on long documents because
    // react-pdf pages render with placeholder heights that expand as PDF
    // content loads. By the time later pages scroll into view, earlier
    // pages may have shifted the layout. Using offsetTop gives us the
    // element's position relative to its offset parent (the scroll
    // container's content), which stays correct regardless of load state.
    // The 12px offset adds breathing room so the page doesn't sit flush
    // against the top edge.
    const targetY = el.offsetTop - 12
    container.scrollTo({ top: targetY, behavior: 'smooth' })
    setSidebarOpen(false)
  }, [])

  // --- Custom search (Cmd+F replacement) ---

  // Intercept Cmd+F to show custom search bar instead of Chrome's
  // broken native find. Chrome can't search across pdfjs text layer
  // spans because each character is a separate absolute-positioned span.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setSearchOpen(true)
        requestAnimationFrame(() => searchInputRef.current?.focus())
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Stores resolved DOM Ranges for each search match, used by CSS
  // Highlight API and for navigating between matches.
  const searchRangesRef = useRef<{ range: Range; pageNum: number }[]>([])

  // Rebuilds CSS highlights with the given active match index.
  const updateCSSHighlights = useCallback((activeIdx: number) => {
    if (!CSS.highlights) return
    const activeHL = new Highlight()
    const inactiveHL = new Highlight()
    for (let i = 0; i < searchRangesRef.current.length; i++) {
      const { range } = searchRangesRef.current[i]
      if (i === activeIdx) activeHL.add(range)
      else inactiveHL.add(range)
    }
    CSS.highlights.set('search-active', activeHL)
    CSS.highlights.set('search-inactive', inactiveHL)
  }, [])

  // Run search whenever the query changes. Uses pre-computed data if
  // available (searches all pages instantly), falls back to DOM-based
  // search (only finds matches on pages with rendered text layers).
  // Renders highlights via CSS Highlight API which handles rotated
  // text layers correctly (browser renders natively).
  useEffect(() => {
    clearAllCSSHighlights()
    searchRangesRef.current = []

    if (!searchQuery.trim() || numPages === 0) {
      setSearchMatches([])
      setCurrentMatchIdx(-1)
      return
    }

    // Build DOM Ranges for each match found on rendered pages.
    // Uses flexibleMatch (whitespace-agnostic) because pre-computed
    // text has spaces from gap detection but DOM text concatenates
    // text nodes without spaces.
    const buildRangesForPage = (el: HTMLElement): { range: Range; start: number; end: number }[] => {
      const content = getPageTextContent(el)
      if (!content) return []
      const results: { range: Range; start: number; end: number }[] = []
      // Find all occurrences on this page
      const strippedQuery = searchQuery.replace(/\s/g, '').toLowerCase()
      if (!strippedQuery) return []
      const originalIndices: number[] = []
      let strippedText = ''
      for (let j = 0; j < content.text.length; j++) {
        if (!/\s/.test(content.text[j])) {
          originalIndices.push(j)
          strippedText += content.text[j]
        }
      }
      const strippedLower = strippedText.toLowerCase()
      let from = 0
      while (true) {
        const idx = strippedLower.indexOf(strippedQuery, from)
        if (idx === -1) break
        const matchStart = originalIndices[idx]
        const lastChar = idx + strippedQuery.length - 1
        const matchEnd = lastChar < originalIndices.length ? originalIndices[lastChar] + 1 : content.text.length
        const range = resolveRange(content.nodes, matchStart, matchEnd)
        if (range) results.push({ range, start: matchStart, end: matchEnd })
        from = idx + 1
      }
      return results
    }

    // Pre-computed path: get match count from all pages, build Ranges
    // for rendered pages only
    if (textPositions) {
      const matches = findAllPrecomputedMatches(textPositions, searchQuery)
      setSearchMatches(matches)

      if (matches.length > 0) {
        setCurrentMatchIdx(0)
        // Build ranges for each page that has matches and is rendered
        const seenPages = new Set<number>()
        const allRanges: { range: Range; pageNum: number }[] = []
        for (const m of matches) {
          if (seenPages.has(m.pageNum)) continue
          seenPages.add(m.pageNum)
          const el = pageRefs.current.get(m.pageNum)
          if (!el) continue
          for (const r of buildRangesForPage(el)) {
            allRanges.push({ range: r.range, pageNum: m.pageNum })
          }
        }
        searchRangesRef.current = allRanges
        updateCSSHighlights(0)
        // Scroll to first match's page
        scrollToPage(matches[0].pageNum)
      } else {
        setCurrentMatchIdx(-1)
      }
      return
    }

    // DOM fallback: search only pages with rendered text layers
    const matches = findAllSearchMatches(pageRefs.current, numPages, searchQuery)
    setSearchMatches(matches)

    if (matches.length > 0) {
      setCurrentMatchIdx(0)
      const allRanges: { range: Range; pageNum: number }[] = []
      for (const m of matches) {
        const el = pageRefs.current.get(m.pageNum)
        if (!el) continue
        const content = getPageTextContent(el)
        if (!content) continue
        const range = resolveRange(content.nodes, m.start, m.end)
        if (range) allRanges.push({ range, pageNum: m.pageNum })
      }
      searchRangesRef.current = allRanges
      updateCSSHighlights(0)
      scrollToPage(matches[0].pageNum)
    } else {
      setCurrentMatchIdx(-1)
    }
  }, [searchQuery, numPages, textPositions])

  const goToMatch = useCallback((idx: number) => {
    if (searchMatches.length === 0) return
    // Rebuild CSS highlights with new active match
    updateCSSHighlights(idx)
    // Scroll to the match's page
    const m = searchMatches[idx]
    scrollToPage(m.pageNum)
    setCurrentMatchIdx(idx)
  }, [searchMatches, updateCSSHighlights])

  const goToNextMatch = useCallback(() => {
    if (searchMatches.length === 0) return
    goToMatch((currentMatchIdx + 1) % searchMatches.length)
  }, [currentMatchIdx, searchMatches, goToMatch])

  const goToPrevMatch = useCallback(() => {
    if (searchMatches.length === 0) return
    goToMatch((currentMatchIdx - 1 + searchMatches.length) % searchMatches.length)
  }, [currentMatchIdx, searchMatches, goToMatch])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchMatches([])
    setCurrentMatchIdx(-1)
    clearAllCSSHighlights()
    searchRangesRef.current = []
  }, [])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) goToPrevMatch()
      else goToNextMatch()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      closeSearch()
    }
  }, [goToNextMatch, goToPrevMatch, closeSearch])

  const currentSectionIndex = useMemo(() => {
    if (outline.length === 0) return -1
    for (let i = outline.length - 1; i >= 0; i--) {
      if (currentPage >= getFirstPage(outline[i].pages)) return i
    }
    return 0
  }, [currentPage, outline])

  const handleToggleFavorite = () => {
    authGate(async () => {
      if (!user || !docId) return
      const nowFav = await toggleFavorite(user.uid, docId)
      setIsFav(nowFav)
    })
  }

  // Progress bar scrubbing
  const scrubToPosition = useCallback((clientX: number) => {
    const bar = progressBarRef.current
    const container = scrollContainerRef.current
    if (!bar || !container) return
    const rect = bar.getBoundingClientRect()
    const progress = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const maxScroll = container.scrollHeight - container.clientHeight
    if (maxScroll > 0) {
      container.scrollTop = progress * maxScroll
    }
  }, [])

  const handleProgressMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    scrubToPosition(e.clientX)
    const onMove = (e: MouseEvent) => scrubToPosition(e.clientX)
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [scrubToPosition])

  if (!doc) {
    return <NotFound />
  }

  if (doc.type === 'image') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Link
            to="/"
            className="text-[var(--color-foreground)]/60 hover:text-[var(--color-foreground)]"
          >
            &larr; Back
          </Link>
          <h1 className="text-lg font-medium">{doc.title}</h1>
        </div>
        <div className="flex justify-center">
          <img
            src={`/documents/${doc.filename}`}
            alt={doc.title}
            className="max-w-full h-auto rounded-lg shadow-sm"
          />
        </div>
      </div>
    )
  }

  const filePath = `/documents/${doc.filename}`

  const outlineNav = (
    <nav className="space-y-px">
      {outline.map((section, i) => (
        <button
          key={i}
          onClick={() => scrollToPage(getFirstPage(section.pages))}
          className={`block w-full text-left py-2 px-3 rounded-md text-[13px] transition-colors border-l-2 ${
            i === currentSectionIndex
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8 text-[var(--color-foreground)]'
              : 'border-transparent text-[var(--color-foreground)]/80 hover:bg-[var(--color-foreground)]/5 hover:text-[var(--color-foreground)]/90'
          }`}
        >
          <span className="block leading-snug">{section.title}</span>
          <span className="text-[12px] text-[var(--color-foreground)]/70">p. {section.pages}</span>
        </button>
      ))}
      {outline.length === 0 && (
        <p className="text-[13px] text-[var(--color-foreground)]/50 italic px-3">
          No outline available
        </p>
      )}
    </nav>
  )

  // Uses --header-height CSS variable instead of hard-coded top-16 (64px).
  // Adapts automatically when the header height changes.
  return (
    <div className="fixed left-0 right-0 bottom-0 z-30 flex flex-col overflow-hidden" style={{ top: 'var(--header-height, 64px)' }}>
      {/* Viewer toolbar. MOBILE: hamburger + truncated title + zoom.
          DESKTOP: back button + outline toggle + centered title + zoom.
          Padding and gap are tighter on mobile to fit all elements. */}
      {/* lg: breakpoint (1024px) for the desktop toolbar layout because
           the back button + centered title + zoom controls need substantial
           width to avoid cramming. Below 1024px the mobile hamburger layout
           handles everything cleanly. This also matches the breakpoint where
           the permanent outline sidebar appears. */}
      <div className="relative flex items-center gap-2 lg:gap-4 px-3 lg:px-10 h-12 bg-[#eef1e6] border-b border-[#d5dac4] flex-shrink-0 z-10">
        {/* MOBILE: hamburger opens sidebar with "Back to Archive" + outline */}
        <button
          className="lg:hidden p-1.5 rounded-md text-[var(--color-foreground)]/60 hover:text-[var(--color-foreground)] hover:bg-[var(--color-foreground)]/5 transition-colors flex-shrink-0"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* DESKTOP: back + outline toggle (hidden on mobile, hamburger replaces it) */}
        <div className="hidden lg:flex items-center gap-3 flex-shrink-0 z-10">
          <Link
            to="/"
            className="flex items-center gap-1.5 h-8 rounded-lg bg-[#e4e9d9] border border-[var(--color-foreground)]/12 px-3 text-sm text-[var(--color-foreground)]/80 hover:text-[var(--color-foreground)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Archive
          </Link>
          {/* No outline toggle needed here: this desktop toolbar section
              only shows at lg+ where the permanent sidebar is visible */}
        </div>

        {/* MOBILE: title + heart as a normal flex child so it truncates
            naturally between the hamburger and zoom controls. */}
        <div className="lg:hidden flex-1 min-w-0 flex items-center gap-1.5">
          <h1 className="text-sm font-medium text-[var(--color-foreground)]/85 truncate">{doc.title}</h1>
          <button
            onClick={handleToggleFavorite}
            className={`flex-shrink-0 transition-all duration-150 ${
              isFav ? 'text-red-500' : 'text-[var(--color-foreground)]/25 hover:text-red-400'
            }`}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isFav ? 0 : 2} fill={isFav ? 'currentColor' : 'none'}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>
        </div>

        {/* DESKTOP: title + heart as absolute overlay (unchanged) */}
        <div className="hidden lg:flex absolute inset-0 items-center justify-center pointer-events-none px-52">
          <h1 className="text-base font-medium text-[var(--color-foreground)]/85 truncate pointer-events-auto">{doc.title}</h1>
          <button
            onClick={handleToggleFavorite}
            className={`flex-shrink-0 ml-2 mt-0.5 transition-all duration-150 hover:scale-110 pointer-events-auto ${
              isFav ? 'text-red-500' : 'text-[var(--color-foreground)]/25 hover:text-red-400'
            }`}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isFav ? 0 : 2} fill={isFav ? 'currentColor' : 'none'}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>
        </div>

        {/* Desktop spacer pushes zoom controls to the right edge */}
        <div className="hidden lg:block flex-1 min-w-0" />

        {/* Zoom controls: visible on all screens. Smaller buttons on mobile. */}
        <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0 z-10">
          <div className="flex items-center h-7 lg:h-8 rounded-lg bg-[#e4e9d9] border border-[var(--color-foreground)]/12 overflow-hidden">
            <button
              onClick={() => setScale((s) => Math.max(0.5, +(s - 0.5).toFixed(2)))}
              className="w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center text-[var(--color-foreground)]/80 hover:text-[var(--color-foreground)] hover:bg-[var(--color-foreground)]/5 transition-colors text-base lg:text-lg font-semibold"
              aria-label="Zoom out"
            >
              -
            </button>
            <span className="text-xs lg:text-sm w-10 lg:w-12 text-center tabular-nums text-[var(--color-foreground)]/80 border-x border-[var(--color-foreground)]/12">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(2.5, +(s + 0.5).toFixed(2)))}
              className="w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center text-[var(--color-foreground)]/80 hover:text-[var(--color-foreground)] hover:bg-[var(--color-foreground)]/5 transition-colors text-base lg:text-lg font-semibold"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
          {/* Desktop: invisible spacer matching header's Sign in width
              so zoom controls align with the header's right-side items. */}
          <span className="hidden lg:inline text-lg font-medium leading-none py-1.5 -ml-2 invisible select-none" aria-hidden="true">Sign in</span>
        </div>

        {/* Progress bar with scrub handle */}
        <div
          ref={progressBarRef}
          className="absolute bottom-0 left-0 right-0 z-20 h-4 flex items-end group"
        >
          <div className="w-full h-[3px] bg-[var(--color-foreground)]/10 relative overflow-visible">
            <div
              className="h-full bg-[var(--color-primary)] relative overflow-visible"
              style={{ width: `${scrollProgress * 100}%` }}
            >
              <div
                className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 p-2 cursor-pointer z-10"
                onMouseDown={handleProgressMouseDown}
              >
                <div className="w-[11px] h-[11px] rounded-full bg-[var(--color-primary)] border-2 border-white shadow-sm group-hover:scale-[1.3] transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-60 overflow-y-auto border-r border-[var(--color-foreground)]/6 bg-[#f4f6ef] flex-shrink-0">
          <div className="p-3 pt-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-foreground)]/70 mb-2 px-3">
              Outline
            </h2>
            {outlineNav}
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div
              className="lg:hidden absolute inset-0 bg-black/20 z-30"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="lg:hidden absolute left-0 top-0 bottom-0 w-72 z-40 overflow-y-auto shadow-xl bg-[#f4f6ef]">
              <div className="p-3 pt-4">
                {/* Top row: Back to Archive (mobile only) + close button.
                    Close button is on this row so it's always at the top
                    right of the sidebar, next to the navigation link. */}
                <div className="flex items-center justify-between mb-3 px-3">
                  <Link
                    to="/"
                    className="lg:hidden flex items-center gap-2 py-2 text-sm text-[var(--color-foreground)]/80 hover:text-[var(--color-foreground)] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Archive
                  </Link>
                  {/* Spacer for desktop (lg+) where Back to Archive is in
                      the toolbar, pushes X button to the right via justify-between */}
                  <div className="hidden lg:block" />
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="text-[var(--color-foreground)]/30 hover:text-[var(--color-foreground)]/60"
                    aria-label="Close sidebar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-foreground)]/70 mb-2 px-3">
                  Outline
                </h2>
                {outlineNav}
              </div>
            </aside>
          </>
        )}

        {/* Custom search bar (Cmd+F replacement). Floats in the top-right
            of the content area, above the PDF. Chrome's native find can't
            search pdfjs text layers because each character is a separate
            absolutely-positioned span. */}
        {searchOpen && (
          <div className="absolute top-3 right-3 z-50 flex items-center gap-2 bg-white rounded-lg shadow-lg border border-black/10 px-3 py-1.5">
            <svg className="w-4 h-4 text-black/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Find in document..."
              className="w-48 text-sm outline-none bg-transparent text-[var(--color-foreground)] placeholder:text-black/30"
              autoFocus
            />
            {searchQuery && (
              <span className="text-xs text-black/50 tabular-nums whitespace-nowrap">
                {searchMatches.length > 0
                  ? `${currentMatchIdx + 1} of ${searchMatches.length}`
                  : 'No results'}
              </span>
            )}
            <div className="flex items-center border-l border-black/10 pl-1.5 gap-0.5">
              <button
                onClick={goToPrevMatch}
                disabled={searchMatches.length === 0}
                className="p-1 rounded hover:bg-black/5 text-black/50 disabled:text-black/20 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={goToNextMatch}
                disabled={searchMatches.length === 0}
                className="p-1 rounded hover:bg-black/5 text-black/50 disabled:text-black/20 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                onClick={closeSearch}
                className="p-1 rounded hover:bg-black/5 text-black/50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* PDF scroll container */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-auto overscroll-none bg-[#e2e8d4]"
          // pan-x pan-y allows touch panning in both directions but
          // disables the browser's built-in pinch-zoom, so our gesture
          // handlers control zoom instead.
          style={{ touchAction: 'pan-x pan-y' }}
        >
          <Document
            file={filePath}
            // w-max expands this wrapper to fit zoomed page widths so the
            // scroll container can scroll horizontally to reach all content.
            // min-w-full ensures it fills the viewport when pages are narrower.
            className="w-max min-w-full"
            onLoadSuccess={handlePdfLoad}
            loading={
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                {/* Pulsing document icon so the user knows the PDF is downloading,
                    not just staring at an empty screen. */}
                <svg
                  className="w-12 h-12 animate-pulse text-[var(--color-foreground)]/30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                <p className="text-sm text-[var(--color-foreground)]/40">Loading document...</p>
              </div>
            }
            error={
              <div className="text-center py-20 text-red-600/70">
                Failed to load document
              </div>
            }
          >
            {/* items-center was replaced with w-fit mx-auto on each page wrapper.
                items-center centers overflow equally on both sides, making the
                left side unreachable via scrollLeft. mx-auto collapses to 0
                when content overflows, so pages start at the left edge and
                the full width is scrollable. w-max/min-w-full on this
                container lets it expand for zoomed content. */}
            <div ref={pagesContainerRef} className="flex flex-col gap-6 py-8 px-4 lg:pr-[240px] w-max min-w-full">
              {Array.from({ length: numPages }, (_, i) => {
                const pageNum = i + 1
                const shouldRender = renderablePages.has(pageNum)
                // Compute expected dimensions for this page. Uses PDF metadata
                // when loaded, falls back to US Letter (612x792 at 72dpi).
                const dim = pageDimensions?.[i] ?? { width: 612, height: 792 }
                let placeholderW: number, placeholderH: number
                if (containerWidth > 0 && containerWidth < 1024) {
                  // Mobile: match the width prop calculation used by <Page>
                  placeholderW = Math.max(200, (containerWidth - 32) * scale)
                  placeholderH = placeholderW * (dim.height / dim.width)
                } else {
                  // Desktop: match the scale prop calculation used by <Page>
                  placeholderW = dim.width * scale
                  placeholderH = dim.height * scale
                }

                return (
                  <div
                    key={pageNum}
                    data-page={pageNum}
                    ref={(el) => {
                      if (el) pageRefs.current.set(pageNum, el)
                      else pageRefs.current.delete(pageNum)
                    }}
                    // w-fit shrinks wrapper to the page's rendered width.
                    // mx-auto centers it when narrower than container, collapses
                    // to 0 margin when wider (so full width is scrollable).
                    // relative positions the highlight overlay container.
                    // minWidth/minHeight prevent the wrapper from collapsing
                    // to 0 while <Page> loads its canvas, and provide correct
                    // dimensions for placeholder (unrendered) pages.
                    className="w-fit mx-auto relative"
                    style={{
                      minWidth: placeholderW,
                      minHeight: placeholderH,
                      ...(shouldRender
                        ? { boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 6px 24px rgba(0,0,0,0.045)' }
                        : {}),
                    }}
                  >
                    {shouldRender && (
                      <Page
                        pageNumber={pageNum}
                        renderTextLayer={true}
                        // Show a subtle loading indicator while the canvas renders.
                        // Without this, pages appear as blank white rectangles for
                        // a moment when scrolling into view (the wrapper div has
                        // dimensions and shadow but no content yet).
                        loading={
                          <div
                            className="flex items-center justify-center bg-white"
                            style={{ width: placeholderW, height: placeholderH }}
                          >
                            <svg
                              className="w-8 h-8 animate-pulse text-[var(--color-foreground)]/25"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                              />
                            </svg>
                          </div>
                        }
                        // Mobile: width prop fits page to container width.
                        // At scale=1.0 (100%), the page fills the screen.
                        // Zooming multiplies from there.
                        // Desktop: scale prop for traditional zoom behavior.
                        // 1024 matches the lg: breakpoint used for the toolbar's
                        // mobile/desktop layout switch
                        {...(containerWidth > 0 && containerWidth < 1024
                          ? { width: Math.max(200, (containerWidth - 32) * scale) }
                          : { scale })}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </Document>
        </div>
      </div>
    </div>
  )
}
