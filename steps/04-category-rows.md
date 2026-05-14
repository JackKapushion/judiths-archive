# Step 04: Category Rows with Horizontal Scrolling

## Goal

Replace the flat "All Documents" grid with horizontally-scrolling category rows. Each category gets a labeled row of document thumbnail cards that scroll sideways. Add scroll arrow buttons for desktop. Keep Favorites and Recently Viewed as the same pattern at the top.

## Requirements

- Add a `category` field to `SoftaDocument`
- Define fake placeholder categories and assign documents to them randomly so Jack can evaluate the layout
- Replace the "All Documents" grid with one `HorizontalSection` per category
- Add left/right scroll arrow buttons to `HorizontalSection` (visible on desktop, hidden on mobile where swipe handles it)
- Favorites and Recently Viewed stay as rows at the top (same component, same behavior)
- When searching, hide category rows and show flat filtered results (existing behavior)

## Prerequisites (Jack does these manually)

None - no shell commands needed for this step.

## Step-by-Step Implementation Plan (Claude Code)

### 1. Add `category` field to document model

In `src/lib/documents.ts`:

- Add `category: string` to the `SoftaDocument` interface
- Define fake categories: "Letters & Correspondence", "Teaching Materials", "Personal Writing", "CHOICES Program", "Photos & Screenshots"
- Assign each document to one of these categories (roughly even distribution)
- Add a helper `getCategories()` that returns an ordered array of unique category names from the documents list
- Add a helper `getDocumentsByCategory(category: string)` that filters documents by category

### 2. Add scroll arrows to `HorizontalSection`

In `src/components/home/horizontal-section.tsx`:

- Add a `ref` to the scroll container
- Add left/right arrow buttons positioned at the edges of the row
- Arrows use `scrollBy()` with smooth behavior to scroll by roughly one viewport width
- Left arrow hidden when scrolled to the start, right arrow hidden when scrolled to the end
- Track scroll position with a scroll event listener to show/hide arrows
- Arrows hidden on mobile (`hidden md:flex` or similar) - mobile uses swipe only
- Style: semi-transparent background circle with a chevron icon, vertically centered on the row

### 3. Update home page to render category rows

In `src/pages/home.tsx`:

- Import `getCategories` and `getDocumentsByCategory`
- Replace the "All Documents" grid section with a loop over categories
- Each category renders a `HorizontalSection` with the category name as the title
- When searching (`isSearching` is true), hide category rows and show the existing flat filtered grid instead
- Favorites and Recently Viewed rows stay unchanged at the top
