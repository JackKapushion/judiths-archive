/**
 * Hero section for the home page. Fills at least the full viewport height
 * so the landing experience feels like a dedicated "page" before you scroll
 * into the library. Uses min-h so content can overflow on short screens
 * (e.g., phones) without clipping or overlapping the library below.
 *
 * The JS scroll-snap in home.tsx handles the snap between this section
 * and the content below. It checks whether the hero bottom is visible
 * before snapping, so users can scroll through the full hero text first.
 */
export function Hero() {
  return (
    <section
      id="hero-section"
      // min-h-[100dvh]: at least viewport height, but grows if content
      // overflows (common on mobile). This prevents text from clipping
      // or overlapping the library section below.
      //
      // MOBILE: No painted-patch card. The hero sits directly on the page
      // background with left-aligned text for readability. pt-14 clears the
      // sticky header (~44px) with breathing room. px-4 matches the category
      // section padding below for visual consistency.
      //
      // DESKTOP: Centered card with painted-patch watercolor background.
      // px-4 gives breathing room around the card. pt-16 positions the
      // card below the taller h-16 desktop header.
      // MOBILE: min-h-0 so the hero is only as tall as its content.
      // min-h-[100dvh] on mobile creates a huge empty green gap below the
      // text because there's no snap scroll to justify filling the viewport.
      // DESKTOP: min-h-[100dvh] fills the viewport for the snap scroll effect.
      // pb-2 on mobile tightens the gap before the search splotch below.
      className="min-h-0 sm:min-h-[100dvh] flex flex-col pt-14 sm:pt-16 pb-0 sm:pb-6 px-0 sm:px-4"
    >
      {/* MOBILE: No painted-patch card (removed by CSS media query in index.css).
          Photo on the left with title on the right in a horizontal row.
          Body text below is left-aligned for readability.
          DESKTOP: Centered column layout with painted-patch card. */}
      {/* pt-1 on mobile (vs pt-12 desktop) minimizes the gap between the
          sticky header and the photo/title row. The section's pt-14 already
          clears the ~44px header with ~12px of clearance, so pt-1 adds just
          4px more for a tight 16px total gap. */}
      <div className="max-w-4xl mx-auto text-left sm:text-center painted-patch pt-1 sm:pt-12 pb-2 sm:pb-16 px-4 sm:px-14">
        {/* MOBILE: horizontal row with photo left, title right.
            DESKTOP: stacked column (photo above title), both centered. */}
        <div className="flex items-center gap-4 sm:block mb-3 sm:mb-6">
          <img
            src="/images/judith.png"
            alt="Judith Orloff"
            className="w-20 h-20 sm:w-40 sm:h-40 rounded-full object-cover flex-shrink-0 sm:mx-auto sm:mb-6 shadow-md"
          />
          <h1 className="text-2xl sm:text-3xl font-normal text-[var(--color-foreground)] sm:mb-0">
            The Archive of<br className="sm:hidden" /> Judith Orloff
          </h1>
        </div>
        <div className="text-[var(--color-foreground)] text-lg leading-relaxed max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <p>
            Judith Orloff, Ed.D., was a mother, grandmother, wife, educator, author, and
            lifelong student who spent over forty years doing one thing:
            challenging people to be true. She believed we all carry patterns from
            childhood that quietly run our lives, and that when we learn to see
            them clearly, we become free to choose differently. She called this
            &ldquo;personal responsibility,&rdquo; and she brought it everywhere: families,
            Fortune 500 companies, hospitals, universities, and communities. Much
            of her work was rooted in Jewish wisdom, drawing on Kabbalah and
            Chassidic teachings to connect ancient tradition with modern
            personal growth.
          </p>
          <p>
            Over a lifetime of teaching, Judith created a vast collection of writings,
            program guides, and materials, most of which existed only as paper in
            filing cabinets and boxes. Her family digitized her entire collection
            and built this archive so her work can reach anyone looking for it.
          </p>
        </div>

        {/* Scroll hint: overlaps the bottom edge of the painted patch via
            negative margin. Hidden on mobile where there's no snap scroll
            and the page scrolls naturally. */}
        <div id="hero-scroll-hint" className="hidden sm:flex justify-center -mb-21 mt-10">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('scroll-to-content'))}
            className="w-11 h-11 rounded-full border border-[var(--color-foreground)]/20 bg-white/60 hover:bg-white/90 flex items-center justify-center transition-colors cursor-pointer"
            style={{ animation: 'bounce-gentle 2.5s ease-in-out infinite' }}
            aria-label="Scroll down to browse the archive"
          >
            <svg className="w-5 h-5 text-[var(--color-foreground)]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}
