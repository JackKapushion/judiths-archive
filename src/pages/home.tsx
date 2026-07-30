import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { documents, type SoftaDocument, getCategories, getDocumentsByCategory } from '../lib/documents'
import { useAuth } from '../components/auth/auth-context'
import { useAuthGate } from '../components/auth/use-auth-gate'
import { getUserData, toggleFavorite, type UserData } from '../lib/user-data'
import { Hero } from '../components/home/hero'
import { SearchBar } from '../components/home/search-bar'
import { HorizontalSection } from '../components/home/horizontal-section'

const defaultUserData: UserData = { favorites: [], progress: {}, recentlyViewed: [] }

// After snapping, show content with the header + breathing room above it.
// Computed dynamically because mobile header is shorter than desktop's h-16.
function getSnapOffset() {
  const header = document.querySelector('header')
  return (header?.offsetHeight ?? 64) + 36
}

export function Home() {
  const { user, loading } = useAuth()
  const authGate = useAuthGate()
  const location = useLocation()
  const [userData, setUserData] = useState<UserData | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const isRealUser = user && !user.isAnonymous

  // Ref holds the saved scroll position until conditions are met to
  // restore it. Nulled after restore so it only fires once.
  const scrollRestoreRef = useRef<number | null>(null)

  // Read saved scroll position on mount. Also sets a 2s fallback
  // in case user data never loads (network error, etc.).
  useEffect(() => {
    const saved = sessionStorage.getItem('home-scroll-y')
    if (saved) {
      const y = parseInt(saved, 10)
      if (!isNaN(y) && y > 0) {
        scrollRestoreRef.current = y
        const fallback = setTimeout(() => {
          if (scrollRestoreRef.current !== null) {
            window.scrollTo(0, scrollRestoreRef.current)
            scrollRestoreRef.current = null
          }
        }, 2000)
        return () => clearTimeout(fallback)
      }
    }
  }, [])

  // Restore scroll once layout is stable: auth resolved AND user data
  // loaded (so Favorites/Recently Viewed sections are in the DOM).
  // Without this, the saved position gets applied before dynamic
  // sections render, then those sections push content down and the
  // user ends up at the wrong spot.
  useEffect(() => {
    if (scrollRestoreRef.current === null) return
    if (loading) return
    if (isRealUser && userData === null) return

    const y = scrollRestoreRef.current
    scrollRestoreRef.current = null
    requestAnimationFrame(() => {
      window.scrollTo(0, y)
    })
  }, [loading, isRealUser, userData])

  // Continuously save scroll position so it's always current when
  // the user navigates away. Can't save in a cleanup function because
  // by the time React's cleanup runs, the DOM has already changed
  // (viewer is position:fixed) and scrollY has been reset to 0.
  useEffect(() => {
    const onScroll = () => {
      sessionStorage.setItem('home-scroll-y', String(window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Re-fetch user data whenever the user navigates back to the home page.
  // Without location.pathname in the deps, React Router keeps this component
  // mounted and the stale userData from the initial load never picks up
  // progress/recently-viewed changes made in the viewer.
  useEffect(() => {
    if (isRealUser) {
      getUserData(user.uid).then(setUserData).catch((err) => {
        console.error('Failed to load user data:', err)
      })
    } else {
      setUserData(null)
    }
  }, [isRealUser, user, location.pathname])

  // ── Scroll-snap effect ──────────────────────────────────────────────
  // A custom full-page scroll snap between the hero and the content.
  //
  // CSS scroll-snap can't do this right: "mandatory" blocks free library
  // scrolling, "proximity" is too weak, and neither gives control over
  // animation timing or a post-snap lock period.
  //
  // Instead we intercept wheel/touch events, run a custom rAF animation
  // with easeOutQuart for a smooth Apple-quality feel, then briefly lock
  // scrolling (~700ms) so the user lands cleanly before free scrolling
  // resumes in the library.
  //
  // State machine: idle (at hero) → animating → locked → free (library)
  // Reverse: free → animating → idle
  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    type State = 'idle' | 'animating' | 'locked' | 'free'
    let state: State = window.scrollY < 100 ? 'idle' : 'free'
    let animationId: number | null = null

    // Momentum detection for Mac trackpads: inertia events fire rapidly
    // with decaying deltaY after the user lifts their fingers. We ignore
    // these so only the initial intentional gesture triggers the snap.
    let lastWheelTime = 0
    let lastDelta = 0

    function isMomentum(e: WheelEvent): boolean {
      const now = performance.now()
      const timeDelta = now - lastWheelTime
      const absDelta = Math.abs(e.deltaY)
      const momentum = timeDelta < 80 && absDelta <= lastDelta && absDelta < 20
      lastWheelTime = now
      lastDelta = absDelta
      return momentum
    }

    // Smooth animation using requestAnimationFrame with easeOutQuart.
    // Starts fast and decelerates gradually, which matches what users
    // expect from momentum-based interfaces (similar to Apple's style).
    function animateTo(target: number, onComplete: () => void) {
      state = 'animating'
      const start = window.scrollY
      const distance = target - start
      const duration = 1000 // ms - long enough for a luxurious feel
      const startTime = performance.now()

      // Safety timeout: if the rAF animation never completes (e.g., Safari
      // tab goes background, rAF stops firing, or an unexpected error),
      // force-complete after 2x duration so scrolling isn't permanently
      // blocked. Without this, state stays 'animating' forever and
      // preventDefault blocks all scroll input.
      const safetyTimeout = setTimeout(() => {
        if (state === 'animating') {
          if (animationId) cancelAnimationFrame(animationId)
          window.scrollTo(0, target)
          onComplete()
        }
      }, duration * 2)

      // easeInOutQuart: very gentle start, strong acceleration through
      // the middle, very gentle landing. Both the start and end have
      // ~200ms of barely-perceptible motion, which makes the animation
      // feel buttery and connected to the scroll gesture rather than
      // mechanical. Stronger than cubic (longer gentle phases).
      function ease(t: number) {
        return t < 0.5
          ? 8 * t * t * t * t
          : 1 - Math.pow(-2 * t + 2, 4) / 2
      }

      function step(currentTime: number) {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        window.scrollTo(0, start + distance * ease(progress))

        if (progress < 1) {
          animationId = requestAnimationFrame(step)
        } else {
          clearTimeout(safetyTimeout)
          window.scrollTo(0, target) // land exactly on target
          onComplete()
        }
      }

      animationId = requestAnimationFrame(step)
    }

    function getSnapTarget() {
      return content!.offsetTop - getSnapOffset()
    }

    // Check if the user can see the scroll-hint arrow button at the
    // bottom of the hero card. If they can, they've seen all the hero
    // content and we should snap immediately on scroll. If not (hero
    // content overflows below the fold on short screens), allow natural
    // scrolling first so they can read everything before the snap fires.
    // Using the arrow button (not the hero section bottom) because the
    // section is always min-h-[100dvh] regardless of content height,
    // which would falsely report "visible" on short screens where the
    // actual content extends below the fold.
    function heroFullyVisible() {
      const arrow = document.getElementById('hero-scroll-hint')
      // Arrow is hidden on mobile (display: none via sm:flex). Snap is
      // already disabled on mobile via the SM_BREAKPOINT check, so this
      // shouldn't run on mobile. Fall back to true just in case.
      if (!arrow || arrow.offsetHeight === 0) return true
      const rect = arrow.getBoundingClientRect()
      return rect.bottom <= window.innerHeight
    }

    // Snap scroll is desktop-only (sm breakpoint = 640px). On mobile,
    // the hero and library scroll naturally with no snap behavior.
    // Checking width in each handler (not once at setup) so orientation
    // changes and resizes are handled correctly.
    const SM_BREAKPOINT = 640

    // ── Wheel handler ──────────────────────────────────────────────
    // passive: false is required so we can preventDefault to block the
    // browser's native scroll while we run our own animation.
    function onWheel(e: WheelEvent) {
      if (window.innerWidth < SM_BREAKPOINT) return

      const snapTarget = getSnapTarget()
      const y = window.scrollY

      // Block all input during animation or lock period
      if (state === 'animating' || state === 'locked') {
        e.preventDefault()
        return
      }

      // ── IDLE: at the hero, waiting for scroll-down intent ──
      if (state === 'idle') {
        if (e.deltaY > 0) {
          // If hero content extends below the viewport (common on mobile),
          // allow natural scrolling so the user can read the full text.
          // Only snap once they've reached the bottom.
          if (!heroFullyVisible()) return

          // User has seen all hero content. Snap to library on
          // intentional scroll-down (ignore trackpad momentum).
          e.preventDefault()
          if (!isMomentum(e)) {
            animateTo(snapTarget, () => {
              state = 'locked'
              // Brief lock after landing so momentum events don't cause
              // jitter. 250ms is enough to absorb trailing trackpad inertia.
              setTimeout(() => {
                state = 'free'
                // Safari fix: cycling the non-passive wheel listener forces
                // WebKit to re-evaluate its scroll handling state. Without
                // this, Safari continues to block native scrolling after
                // the programmatic scrollTo animation, even though we stop
                // calling preventDefault() in the 'free' state. Chrome
                // handles this fine; Safari needs the listener reset.
                window.removeEventListener('wheel', onWheel)
                window.addEventListener('wheel', onWheel, { passive: false })
              }, 250)
            })
          }
        }
        // Scroll-up in idle: don't block. On desktop there's nowhere
        // to go (scrollY=0). On mobile the browser handles rubber-band.
        return
      }

      // ── FREE: scrolling through the library ──
      if (state === 'free') {
        // Watch for scroll-back-to-hero: when the user scrolls up
        // close to the snap target, animate directly to hero (skipping
        // the intermediate "Scroll down" view entirely). The +60 buffer
        // triggers the reverse BEFORE the sentinel enters the viewport,
        // so the inline search bar never flashes on the way up.
        if (y <= snapTarget + 60 && e.deltaY < 0) {
          e.preventDefault()
          // Safari gesture model: only the first wheel event in a gesture
          // is cancelable. Since this gesture started in 'free' state
          // (no preventDefault), all events here are non-cancelable and
          // preventDefault is a no-op. The compositor thread keeps applying
          // momentum, fighting our scrollTo animation and causing jitter.
          // Freezing overflow kills the compositor's scroll entirely so
          // our animation runs unopposed. Restored on animation complete.
          const htmlEl = document.documentElement
          htmlEl.style.overflowY = 'hidden'
          // Signal to the SearchBar observer to hold isStuck=true during
          // animation so the header search bar doesn't flicker off as we
          // scroll past the intermediate section
          htmlEl.dataset.snapAnimating = '1'
          animateTo(0, () => {
            state = 'idle'
            htmlEl.style.overflowY = ''
            delete htmlEl.dataset.snapAnimating
            // Tell SearchBar to remove the search bar from the header
            // now that we've landed on the hero
            window.dispatchEvent(new CustomEvent('snap-to-hero'))
          })
        }
      }
    }

    // ── Touch handlers for mobile ──────────────────────────────────
    let touchStartY = 0

    function onTouchStart(e: TouchEvent) {
      touchStartY = e.touches[0].clientY
    }

    function onTouchMove(e: TouchEvent) {
      if (window.innerWidth < SM_BREAKPOINT) return

      if (state === 'animating' || state === 'locked') {
        e.preventDefault()
        return
      }

      const touchDelta = touchStartY - e.touches[0].clientY
      const snapTarget = getSnapTarget()
      const y = window.scrollY

      // Swipe up (scroll down) while on the hero.
      // Same logic as wheel: only snap if the hero bottom is visible.
      // If not, let the browser scroll naturally through hero content.
      if (state === 'idle' && touchDelta > 50) {
        if (!heroFullyVisible()) return
        e.preventDefault()
        animateTo(snapTarget, () => {
          state = 'locked'
          setTimeout(() => { state = 'free' }, 250)
        })
        return
      }

      // Swipe down (scroll up) while at top of content
      if (state === 'free' && y <= snapTarget + 5 && touchDelta < -50) {
        e.preventDefault()
        animateTo(0, () => { state = 'idle' })
      }
    }

    // ── Passive scroll listener for state sync ─────────────────────
    // Safety net: if the scroll position and state get out of sync
    // (e.g., browser back/forward, keyboard scroll, momentum flick
    // past the hero), correct it.
    function onScroll() {
      if (state === 'animating' || state === 'locked') return
      const snapTarget = getSnapTarget()
      if (state === 'idle' && window.scrollY >= snapTarget) state = 'free'
      if (state === 'free' && window.scrollY === 0) state = 'idle'
    }

    // ── Recalculate on resize ──────────────────────────────────────
    // The hero uses min-h-[100dvh], so the snap target can change when
    // the window resizes (e.g., mobile keyboard, orientation change).
    function onResize() {
      const snapTarget = getSnapTarget()
      if (state === 'idle' && window.scrollY >= snapTarget) state = 'free'
    }

    // ── Arrow button click handler ───────────────────────────────
    // The hero's arrow button dispatches this event as a click-to-scroll
    // alternative for users who don't think to scroll.
    function onScrollToContent() {
      if (window.innerWidth < SM_BREAKPOINT) {
        // Mobile: smooth native scroll (no snap animation)
        const target = content!.offsetTop - getSnapOffset()
        window.scrollTo({ top: target, behavior: 'smooth' })
        return
      }
      if (state === 'idle') {
        const snapTarget = getSnapTarget()
        animateTo(snapTarget, () => {
          state = 'locked'
          setTimeout(() => { state = 'free' }, 250)
        })
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll-to-content', onScrollToContent)

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      // Restore overflow in case unmount happens during reverse snap
      // animation (which sets overflow: hidden to freeze compositor scroll)
      document.documentElement.style.overflowY = ''
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll-to-content', onScrollToContent)
    }
  }, [])

  // useCallback so this is a stable reference. Without it, every Home render
  // creates a new function, which defeats React.memo on HorizontalSection
  // and DocumentCard (they'd see a new onToggleFavorite prop every time).
  const handleToggleFavorite = useCallback(
    (docId: string) => {
      authGate(async () => {
        if (!user) return
        try {
          const nowFav = await toggleFavorite(user.uid, docId)
          setUserData((prev) => {
            const base = prev ?? defaultUserData
            return {
              ...base,
              favorites: nowFav
                ? [...base.favorites, docId]
                : base.favorites.filter((id) => id !== docId),
            }
          })
        } catch (err) {
          console.error('Failed to toggle favorite:', err)
        }
      })
    },
    [authGate, user]
  )

  const favorites = useMemo(
    () => new Set(userData?.favorites ?? []),
    [userData?.favorites]
  )

  // Pass reading progress to document cards so they can show
  // how far the user has read on hover. Same threading pattern as favorites.
  const progress = useMemo(
    () => userData?.progress ?? {},
    [userData?.progress]
  )

  const recentDocs = useMemo(
    () =>
      userData?.recentlyViewed
        ?.map((entry) => documents.find((d) => d.id === entry.docId))
        .filter((d): d is SoftaDocument => d !== undefined)
        .slice(0, 5) ?? [],
    [userData?.recentlyViewed]
  )

  const favoriteDocs = useMemo(
    () =>
      userData?.favorites
        ?.map((id) => documents.find((d) => d.id === id))
        .filter((d): d is SoftaDocument => d !== undefined) ?? [],
    [userData?.favorites]
  )

  // Documents are static (hardcoded array), so categories and their filtered
  // doc lists never change. Memoizing with [] deps computes them once.
  // Without this, getDocumentsByCategory() returns a new array every render,
  // which breaks React.memo on HorizontalSection (new docs reference = re-render).
  const categories = useMemo(() => getCategories(), [])
  const categoryDocs = useMemo(() => {
    const map = new Map<string, SoftaDocument[]>()
    for (const cat of categories) {
      map.set(cat.name, getDocumentsByCategory(cat.name))
    }
    return map
  }, [categories])

  return (
    <div>
      <Hero />

      {/* Content section: the snap target. The JS scroll-snap effect uses
          this ref to calculate where to snap to. Everything below the hero
          (search bar + library categories) lives in this div. */}
      <div ref={contentRef}>
        <SearchBar />

        {/* MOBILE: px-0 so category rows extend edge-to-edge. Each
            HorizontalSection has its own px-4 for title text padding.
            DESKTOP: px-4 for breathing room around the max-width container. */}
        {/* MOBILE: pt-3 adds a small gap between the search splotch and
            the first category section. This compensates for the search
            splotch being shorter (thinner feathered edges = less natural
            blending into the next section vs the taller category sections).
            DESKTOP: pt-8 for breathing room below search bar. */}
        {/* MOBILE: pt-0 matches the mb-0 between category sections (no
            extra gap, paint overlap handles the transition).
            DESKTOP: pt-8 for breathing room below search bar. */}
        <div className="max-w-5xl mx-auto px-0 sm:px-4 pt-0 sm:pt-8 pb-8">
          {/* index prop controls z-index stacking on mobile where sections
              overlap. Earlier sections get higher z-index so their feathered
              bottom edge paints over the next section's top. Gaps in index
              values are fine (stacking just needs decreasing order). */}
          {isRealUser && favoriteDocs.length > 0 && (
            <HorizontalSection
              index={0}
              title="Favorites"
              color="#DE7880"
              docs={favoriteDocs}
              favorites={favorites}
              progress={progress}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {isRealUser && recentDocs.length > 0 && (
            <HorizontalSection
              index={1}
              title="Recently Viewed"
              color="#1E9AAF"
              docs={recentDocs}
              favorites={favorites}
              progress={progress}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {categories.map((category, i) => (
            <HorizontalSection
              key={category.name}
              index={2 + i}
              title={category.name}
              description={category.description}
              color={category.color}
              docs={categoryDocs.get(category.name)!}
              favorites={favorites}
              progress={progress}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center pt-4 pb-8 text-sm text-[var(--color-foreground)]/50">
          <a
            href="https://github.com/JackKapushion/saftas-archive"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--color-foreground)]/80 transition-colors underline"
          >
            View source code on GitHub
          </a>
        </footer>
      </div>
    </div>
  )
}
