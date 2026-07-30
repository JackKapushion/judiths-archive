# Security

How the site is protected and what the attack surface looks like.

## Authentication

Users sign in through Firebase Auth (Google OAuth or email link). The site also supports anonymous sessions so people can try the chat without creating an account.

All Cloud Functions verify Firebase auth tokens before doing anything. The token is checked with `getAuth().verifyIdToken()`, which validates the signature against Firebase's public keys. There's no way to forge this without compromising Firebase itself.

The admin dashboard has an additional check: the verified token's email must match a hardcoded admin email in the backend. This email only exists in server-side code (Cloud Functions), never in the frontend bundle.

## Firestore Rules

Every Firestore collection has explicit security rules. The key principles:

**Users can only access their own data.** Conversations, messages, and user preferences all require `request.auth.uid == userId`. There's no way for one user to read or modify another user's conversations.

**Messages are server-managed.** Only Cloud Functions (running with admin SDK privileges) can write messages. The client has no write access to the messages subcollection. This prevents users from injecting fake assistant responses or tampering with conversation history.

**Counters are invisible to clients.** The counter documents (global totals, daily/monthly spending trackers) have no client-side rules at all, so Firestore's default deny applies. Only Cloud Functions can read or write them.

**Visit tracking is write-only.** Anyone can log a visit (needed for analytics on unauthenticated users), but the shape is strictly validated: must have exactly `visitorId` (string, under 100 chars), `timestamp` (must equal server time), and `path` (string, under 500 chars). No one can read, update, or delete visit records from the client.

## Spending Controls

The chat uses the Anthropic API (Claude Sonnet 5), which costs money per request. There are multiple layers preventing runaway costs:

**Per-user rate limit.** 20 messages per rolling hour per user, enforced via Firestore transactions.

**Input length cap.** Messages over 4,000 characters are rejected before any API call happens.

**Tool round cap.** The agentic retrieval loop (where Claude searches and reads documents) is limited to 7 rounds per question. This bounds the number of API calls per user message.

**Monthly spending cap.** Before every chat request, the function reads a monthly counter doc and checks if the estimated cost has exceeded the cap (currently $100). If it has, the endpoint returns 503 with a clear message that chat is temporarily unavailable. This is the hard stop that protects against both organic overuse and abuse.

**Anthropic org limit.** As a second safety net, the Anthropic account itself has a $100 monthly spend limit configured on the platform side.

## What's Server-Side vs Client-Side

All security decisions are made server-side. The frontend is purely presentational.

The admin dashboard doesn't check who you are in JavaScript. It calls the backend, and the backend decides whether to return data or a 403. If someone navigates to `/admin` in their browser, they just see "Not authorized" because the API rejects them.

Rate limits, spending caps, and auth verification all happen in Cloud Functions before any work is done. None of these can be bypassed by modifying the frontend.

## Static Assets

PDF documents and other static files are served by Firebase Hosting, which is a read-only CDN. There's no upload or modification API. The only way to change hosted files is through `firebase deploy`, which requires authenticated CLI access.

## Secrets

The Anthropic API key is stored in Firebase's Secret Manager and injected into Cloud Functions at runtime via the `secrets` configuration. It never appears in source code, environment files, or the frontend bundle.

Firebase client configuration values (API key, project ID, etc.) are intentionally public. They're identifiers, not secrets. Firebase's security comes from Firestore rules and auth token verification, not from hiding the project config.

## Known Tradeoffs

**Anonymous chat access.** Anyone can use the chat without signing up. This means the per-user rate limit can be circumvented by creating multiple anonymous Firebase accounts. The monthly spending cap is the backstop here: even if someone scripts mass anonymous usage, total spend can't exceed the cap. The tradeoff is better UX (no signup friction to try the chat) at the cost of being able to burn through the monthly budget faster.

**No request body validation.** The chat endpoint uses TypeScript type assertions rather than runtime validation (like zod) on incoming request bodies. Malformed requests could cause unexpected behavior, though the worst case is a function error (not a security breach).
