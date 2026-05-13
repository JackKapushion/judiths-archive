# Step 02: Foundation

## Goal

Get the site to a fully working state - document browsing, PDF viewing, auth, favorites, reading progress, and recently viewed. Mobile-first, responsive. Easy to restyle later.

## Requirements

- Public document browsing (no auth required to read)
- Google sign-in + email link (passwordless) auth
- Auth modal triggered lazily when user tries to favorite/save
- PDF viewer with inline reading
- Favorites (per user, stored in Firestore)
- Reading progress tracking (remembers current page per PDF)
- Recently viewed documents
- Mobile-first responsive layout
- PDFs served as static assets from `public/documents/`
- Foundation that's easy to restyle and rearrange

## Prerequisites (Jack does these manually)

### 1. Complete plan 01

Make sure the basic Vite + React + TypeScript + Tailwind project is scaffolded and running.

### 2. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" (or "Add project")
3. Name it something like `softas-archive`
4. Disable Google Analytics (not needed for this)
5. Click "Create project"

### 3. Register a web app

1. In your Firebase project, click the web icon (`</>`) on the project overview page
2. Nickname it `softas-site`
3. Check "Also set up Firebase Hosting"
4. Click "Register app"
5. You'll see a config object with `apiKey`, `authDomain`, etc. - keep this tab open, you'll need it in step 7

### 4. Enable Authentication providers

1. In the Firebase console sidebar, go to **Build > Authentication**
2. Click "Get started"
3. Go to the **Sign-in method** tab
4. Enable **Google**:
   - Click Google in the provider list
   - Toggle "Enable"
   - Set a support email (your email)
   - Save
5. Enable **Email/Password**:
   - Click Email/Password in the provider list
   - Toggle "Enable" for Email/Password
   - Toggle "Enable" for **Email link (passwordless sign-in)**
   - Save
6. Go to the **Settings** tab > **Authorized domains**
   - `localhost` should already be there
   - Add `judithorloff.org` (you'll need this for production)

### 5. Create Firestore database

1. In the sidebar, go to **Build > Firestore Database**
2. Click "Create database"
3. Choose a location (pick something close to your users - `us-east1` or `nam5` are fine)
4. Start in **test mode** for now (we'll set proper rules in the implementation)
5. Click "Create"

### 6. Install npm packages

```bash
npm install firebase react-router-dom react-pdf
```

`react-pdf` (by wojtekmaj, v10.x) bundles its own compatible `pdfjs-dist` - no need to install it separately.

### 7. Create `.env.local` with Firebase config

Create a file at the project root called `.env.local` with the values from step 3:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 8. Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### 9. Copy documents to the project

Copy all files from the source folder into `public/documents/`:

```bash
mkdir -p public/documents
cp /Users/jack/Library/Mobile\ Documents/com~apple~CloudDocs/Softas\ docs/* public/documents/
```

Then list the files so Claude Code can build the document manifest:

```bash
ls public/documents/
```

Share the output with Claude Code before giving the green light.

### 10. Initialize Firebase in the project

```bash
firebase init
```

When prompted, select both **Firestore** and **Hosting**. Then:

**Firestore prompts:**
- Use the default `firestore.rules` file
- Use the default `firestore.indexes.json` file

**Hosting prompts:**
- Set public directory to `dist`
- Configure as single-page app: **Yes**
- Don't overwrite `index.html`

This generates `firebase.json`, `.firebaserc`, `firestore.rules`, and `firestore.indexes.json` automatically.

---

## Step-by-Step Implementation Plan (Claude Code)

### 1. Firebase config module

Create `src/lib/firebase.ts` that initializes the Firebase app, Auth, and Firestore using the env vars from `.env.local`.

### 2. Document manifest

Create `src/lib/documents.ts` with a static array of document metadata:

```ts
interface SoftaDocument {
  id: string;           // kebab-case slug
  title: string;        // human-readable display title
  filename: string;     // actual filename in public/documents/
  type: 'pdf' | 'image';
}
```

Populate this based on the file listing Jack provides from prerequisite step 9. Derive readable titles from filenames (Jack can adjust these later).

### 3. Auth context

Create `src/components/auth/auth-context.tsx`:

- React context that provides the current Firebase user (or null)
- Wraps the app at the top level
- Listens to `onAuthStateChanged`
- Exposes `user`, `loading`, `signOut`

### 4. Auth modal

Create `src/components/auth/auth-modal.tsx`:

- Modal/overlay that appears when an unauthenticated user tries to favorite, etc.
- Two sign-in options:
  - "Sign in with Google" button (uses `signInWithPopup`)
  - Email input + "Send sign-in link" button (uses `sendSignInLinkToEmail`)
- For email link: store the email in `localStorage` so we can complete sign-in when they return
- Handle the email link callback on app load (check `isSignInWithEmailLink` on mount)
- Modal can be triggered from anywhere via a context or callback

### 5. Auth gate hook

Create `src/components/auth/use-auth-gate.ts`:

- A custom React hook that returns a function to wrap auth-required actions
- If the user is not authenticated, it opens the auth modal instead of running the action
- If the user is authenticated, it runs the action immediately
- Usage in a component:
  ```tsx
  const authGate = useAuthGate();
  <button onClick={() => authGate(() => toggleFavorite(docId))}>Favorite</button>
  ```

### 6. Router setup

Set up React Router in `src/App.tsx`:

- `/` - Home page (document list)
- `/read/:docId` - Document viewer page

### 7. Layout components

Create responsive layout components:

- `src/components/layout/header.tsx` - Site title, navigation, sign-in button or user menu
- `src/components/layout/layout.tsx` - Wraps pages with header, max-width container, padding

Mobile-first: hamburger menu or simple collapsing nav on small screens. Keep it minimal and easy to restyle.

### 8. Home page

Create `src/pages/home.tsx`:

- Displays all documents in a grid/list
- Each document card shows: title, type icon (PDF/image), favorite button (heart)
- Clicking a card navigates to `/read/:docId`
- If user is logged in, show a "Recently Viewed" section at the top (last 5-10 docs)
- If user is logged in, show a "Favorites" section or filter
- Favorite button triggers auth gate if not logged in

### 9. Document viewer page

Create `src/pages/viewer.tsx`:

- Loads the document by `docId` from the manifest
- For PDFs: renders using `react-pdf`'s `<Document>` and `<Page>` components
  - **PDF.js worker setup** (do this once in `src/main.tsx` or a dedicated `src/lib/pdf-setup.ts`):
    - Import `pdfjs` from `react-pdf` and set the worker source using Vite's `import.meta.url` pattern:
      ```ts
      import { pdfjs } from 'react-pdf';
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
      ```
      This tells Vite to include the worker as a separate asset in the build and gives the app the correct URL to load it from at runtime.
    - Import react-pdf's CSS for text selection and annotation overlays:
      ```ts
      import 'react-pdf/dist/Page/AnnotationLayer.css';
      import 'react-pdf/dist/Page/TextLayer.css';
      ```
    - If the worker import path doesn't resolve cleanly with the installed version, fall back to the CDN approach:
      ```ts
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      ```
  - Build simple custom controls with Tailwind: prev/next page buttons, page number display, zoom in/out
  - Load PDF from `/documents/{filename}`
- For images: simple `<img>` tag with responsive sizing
- Back button to return to home
- Favorite button in the header area
- On page change in PDF viewer, save progress to Firestore (debounced)
- On load, restore last reading position from Firestore

### 10. Firestore user data service

Create `src/lib/user-data.ts`:

Data model - single document per user at `users/{uid}`:

```ts
interface UserData {
  favorites: string[];                    // array of doc IDs
  progress: Record<string, {
    currentPage: number;
    totalPages: number;
    lastReadAt: Timestamp;
  }>;
  recentlyViewed: Array<{
    docId: string;
    viewedAt: Timestamp;
  }>;
}
```

Functions:
- `getUserData(uid)` - fetch the user's data doc
- `toggleFavorite(uid, docId)` - add/remove from favorites array
- `updateProgress(uid, docId, currentPage, totalPages)` - update reading progress
- `addRecentlyViewed(uid, docId)` - add to recently viewed (cap at 20, deduplicate)
- `isFavorite(uid, docId)` - check if a doc is favorited

Use `setDoc` with `{ merge: true }` so we don't overwrite other fields.

### 11. Firestore security rules

Update `firestore.rules` (generated by `firebase init` in prerequisite step 10) with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Users can only read/write their own document. No public access to user data.

### 12. Wire it all together

- Wrap app with `AuthProvider` and `BrowserRouter` in `main.tsx` or `App.tsx`
- Handle email link sign-in callback on app mount
- Connect favorite buttons to Firestore via auth gate
- Connect PDF viewer page changes to progress tracking
- Connect document opens to recently viewed tracking
- Make sure all interactive elements work on mobile (touch targets, scrolling, etc.)

### 13. Verify Firebase config

`firebase.json`, `.firebaserc`, `firestore.rules`, and `firestore.indexes.json` should already exist from prerequisite step 10. Verify `firebase.json` has both the `firestore` and `hosting` sections with correct values (public dir is `dist`, SPA rewrite is present, rules path points to `firestore.rules`).
