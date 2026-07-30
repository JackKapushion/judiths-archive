// Claude Sonnet 5 pricing (per million tokens).
// Shared between chat.ts (spending cap enforcement) and admin.ts (dashboard).
// Update these if Anthropic changes pricing.
export const PRICE_PER_MTOK = {
  input: 3.0,
  output: 15.0,
  cacheCreation: 3.75,
  cacheRead: 0.30,
}

// Monthly spending cap in dollars. When the estimated cost for the
// current calendar month (UTC) exceeds this, the chat endpoint
// returns 503 and tells users chat is temporarily unavailable.
export const MONTHLY_COST_CAP = 100

export function computeCost(usage: {
  inputTokens?: number
  outputTokens?: number
  cacheCreationTokens?: number
  cacheReadTokens?: number
}): number {
  return (
    ((usage.inputTokens ?? 0) * PRICE_PER_MTOK.input +
      (usage.outputTokens ?? 0) * PRICE_PER_MTOK.output +
      (usage.cacheCreationTokens ?? 0) * PRICE_PER_MTOK.cacheCreation +
      (usage.cacheReadTokens ?? 0) * PRICE_PER_MTOK.cacheRead) /
    1_000_000
  )
}

// Firestore doc path for the current month's counter.
// Uses UTC so it's consistent regardless of where the function runs.
// Format: counters/monthly-2026-07
export function getMonthlyCounterPath(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `counters/monthly-${year}-${month}`
}

// Firestore doc path for a day's counter. Used for today/28-day cost
// breakdowns on the dashboard. Each day gets its own doc so there's
// no reset logic. Format: counters/daily-2026-07-29
export function getDailyCounterPath(date?: Date): string {
  const d = date ?? new Date()
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `counters/daily-${year}-${month}-${day}`
}
