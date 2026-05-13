# Design Choices

Decisions made so far for Softa's Archive (judithorloff.org).

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS
- Firebase (Auth, Firestore, Hosting)
- @react-pdf-viewer for inline PDF reading
- No Firebase Storage - PDFs served as static assets from `public/documents/`

## Authentication

- Google sign-in + email link (passwordless) - both options available
- Auth is lazy - users can browse and read everything without an account
- Auth modal only appears when a user tries to do something that requires an account (favoriting, etc.)
- No invite system or access restrictions - fully public site

## User Features

- **Favorites** - users can favorite documents
- **Reading progress** - tracks which page the user was on in each PDF, so they can pick up where they left off
- **Recently viewed** - tracks documents the user has opened recently
- No highlighting or annotations (may revisit later)

## Data Model

- Single Firestore document per user stores everything (favorites, progress, recently viewed)
- 29 fixed documents total, so this stays well under Firestore limits
- Document metadata lives in a static TypeScript manifest file, not in Firestore

## Documents

- 27 PDFs + 2 PNGs, sourced from iCloud Drive
- Fixed collection - not expected to grow
- No categories or tagging yet - flat list for now, will be addressed later
- PDFs must be viewable inline on the site, not just downloadable

## Design and Layout

- Mobile-first - must work perfectly on phones and desktop
- Look and feel TBD - starting with a plain, functional foundation
- Layout designed to be easy to rearrange and restyle
- Site structure: home page (document list) and viewer page (PDF reader)
- Additional pages (about, etc.) TBD

## Hosting

- Firebase Hosting
- Domain: judithorloff.org (Namecheap)
