# Softas Site

## Code Comments

When writing or modifying code, always add comments explaining **why** something is done the way it is. The goal is to leave context for the next person (or AI) that touches this code. Don't just describe what the code does. Explain the reasoning, tradeoffs, and constraints that led to the decision.

Good: `// Using proximity (not mandatory) so scroll-snap only activates near snap points, allowing free scrolling through the library`

Bad: `// Set scroll snap type`

This applies to CSS, component logic, data structures, and architectural decisions. If you had to think about it, leave a comment explaining why.

## Mobile Design Principles

The desktop version was designed and finalized first. Mobile changes must never break or alter the desktop layout. All mobile-specific styles use Tailwind's responsive prefixes (base = mobile, `sm:` = desktop) or CSS media queries.

**Header:**
- The header bar must always be visible (sticky) on both mobile and desktop.
- The header must have the painted watercolor effect on both mobile and desktop.
- iOS Safari does not correctly support per-axis `overflow-x: clip` (it clips both axes). The painted-header CSS uses a media query: `overflow-x: clip` on desktop, `overflow: visible` on mobile with the pseudo constrained to `left: 0; right: 0`.
- On mobile: "Judith's Archive" on the left, hamburger menu on the right. The hamburger dropdown shows "Sign in" (with person icon) then "AI Chat" (with chat icon), separated by a divider.
- On desktop: "Judith's Archive" on the left, "AI Chat" pill button and "Sign in" text on the right. No hamburger.
- Icons in menus/buttons must optically align with text. SVG icons sit slightly above mathematical center because text x-height is above center. Use `-mt-1` on desktop (text-lg), `-mt-1.5` on mobile (smaller text).

**Hero section:**
- No snap scroll on mobile. The hero and library scroll naturally. Snap scroll is desktop-only (640px+ / sm breakpoint).
- No chevron/scroll-hint on mobile since there's no snap.
- The hero uses `min-h-[100dvh]` (not fixed `h-[100dvh]`) so content can overflow on short screens without clipping or overlapping the library below.
- On mobile, the painted-patch background goes full-width (`px-0` on the section) so the watercolor edges reach the screen edges instead of floating in a narrow strip.
- The hero's section top padding overlaps slightly behind the sticky header so the watercolor's feathered top edge hides behind the header bar (no visible green gap).
- Judith's photo must fit entirely inside the visible watercolor area. The watercolor texture has feathered/irregular edges that eat ~25px on each side, so internal padding must be generous enough to keep the photo and text within the visible paint.

**Spacing and alignment:**
- When an element has multiple items with dividers between them, all gaps must be equal. Don't add container padding that makes outer gaps larger than inner gaps. Let each item's own padding define the spacing.
- When the user says "space below X," they mean specifically below, not above. Don't reduce both sides equally. Be precise about which direction to adjust.
- The 8px grid (Tailwind's spacing scale) is the standard. All spacing should be multiples of 4 or 8.

**Typography:**
- Description/body text should be `text-lg` (18px) on both mobile and desktop. Don't shrink body text below 16px.
- Headings scale down on mobile: `text-2xl` on mobile, `text-3xl` on desktop.

**General:**
- Always test that desktop is unchanged after mobile work. Deploy and verify both.
- The painted watercolor textures have irregular edges. Account for this in padding calculations. Content must sit inside the visible paint area, not just inside the div's bounding box.
