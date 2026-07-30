import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { computeCost, getMonthlyCounterPath, getDailyCounterPath, MONTHLY_COST_CAP } from './pricing'

const ADMIN_EMAIL = 'jack.kapushion@gmail.com'

export const adminStats = onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Verify caller is the admin
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    try {
      const token = authHeader.split('Bearer ')[1]
      const decoded = await getAuth().verifyIdToken(token)
      if (decoded.email !== ADMIN_EMAIL) {
        res.status(403).json({ error: 'Forbidden' })
        return
      }
    } catch {
      res.status(401).json({ error: 'Invalid auth token' })
      return
    }

    const db = getFirestore()
    const now = new Date()
    const periodStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
    const periodTimestamp = Timestamp.fromDate(periodStart)

    // Start of today (UTC) for "today" metrics
    const todayStart = new Date(now)
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayTimestamp = Timestamp.fromDate(todayStart)

    // --- Visits ---
    // Only need visitorId + timestamp for unique-visitor dedup and
    // time-window filtering. select() keeps bandwidth low.
    const visitsSnap = await db
      .collection('visits')
      .select('visitorId', 'timestamp')
      .get()

    const allVisitorIds = new Set<string>()
    const recentVisitorIds = new Set<string>()
    const todayVisitorIds = new Set<string>()

    for (const doc of visitsSnap.docs) {
      const data = doc.data()
      const vid = data.visitorId as string
      const ts = data.timestamp as Timestamp | undefined

      allVisitorIds.add(vid)

      if (ts) {
        const tsMillis = ts.toMillis()
        if (tsMillis >= periodTimestamp.toMillis()) {
          recentVisitorIds.add(vid)
        }
        if (tsMillis >= todayTimestamp.toMillis()) {
          todayVisitorIds.add(vid)
        }
      }
    }

    // --- Users ---
    // Firebase Auth is the source of truth for account counts.
    // listUsers() returns up to 1000 per batch; paginate for larger sets.
    let totalAccounts = 0
    let recentAccounts = 0
    let todayAccounts = 0

    let listResult = await getAuth().listUsers(1000)
    while (true) {
      for (const user of listResult.users) {
        // Skip anonymous accounts (auto-created, not real signups)
        if (!user.email) continue
        totalAccounts++
        const created = new Date(user.metadata.creationTime)
        if (created >= periodStart) recentAccounts++
        if (created >= todayStart) todayAccounts++
      }
      if (!listResult.pageToken) break
      listResult = await getAuth().listUsers(1000, listResult.pageToken)
    }

    // --- Chat ---
    // All-time totals come from counters/global (never decreases, survives
    // conversation deletions). Daily counters provide today + 28-day windows.

    // Fetch global counter and 28 daily counter docs in parallel.
    // getAll() batches the daily reads into a single round trip.
    const dailyRefs = Array.from({ length: 28 }, (_, i) => {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      return db.doc(getDailyCounterPath(d))
    })
    const [countersSnap, ...dailySnaps] = await db.getAll(
      db.doc('counters/global'),
      ...dailyRefs,
    )
    const global = countersSnap.data() ?? {}

    // One-time migration: if daily counters haven't been populated yet
    // (because they were deployed after the first conversations happened),
    // copy the global counter values into today's daily and current month's
    // monthly counter so existing data appears in the correct time buckets.
    // This is safe to repeat (set with merge) and becomes a no-op once
    // daily counters have their own incremented data.
    if (!dailySnaps[0].exists && countersSnap.exists) {
      const globalData = countersSnap.data()!
      await Promise.all([
        db.doc(getDailyCounterPath()).set(globalData, { merge: true }),
        db.doc(getMonthlyCounterPath()).set(globalData, { merge: true }),
      ])
      // Re-read so the response reflects the backfilled values
      const [freshDaily] = await db.getAll(dailyRefs[0])
      // Mutate the snapshot array so downstream code sees the data
      ;(dailySnaps as FirebaseFirestore.DocumentSnapshot[])[0] = freshDaily
    }

    // Helper: extract a numeric field from counter data, defaulting to 0
    const num = (data: Record<string, unknown>, key: string) =>
      (data[key] as number) ?? 0

    // Today = first daily snapshot (index 0)
    const todayData = dailySnaps[0].data() ?? {}

    // Period = sum of all 28 daily snapshots
    const periodData: Record<string, number> = {}
    for (const snap of dailySnaps) {
      const data = snap.data() ?? {}
      for (const key of [
        'totalConversations', 'totalMessages',
        'totalInputTokens', 'totalOutputTokens',
        'totalCacheCreationTokens', 'totalCacheReadTokens',
      ]) {
        periodData[key] = (periodData[key] ?? 0) + num(data, key)
      }
    }

    const costFrom = (data: Record<string, unknown>) => computeCost({
      inputTokens: num(data, 'totalInputTokens'),
      outputTokens: num(data, 'totalOutputTokens'),
      cacheCreationTokens: num(data, 'totalCacheCreationTokens'),
      cacheReadTokens: num(data, 'totalCacheReadTokens'),
    })

    // --- Monthly spending ---
    // Read the current month's counter doc for the spending cap bar.
    // Same doc the chat function checks before allowing messages.
    const monthlySnap = await db.doc(getMonthlyCounterPath()).get()
    const monthlyCost = costFrom(monthlySnap.data() ?? {})

    res.json({
      period: {
        start: periodStart.toISOString(),
        end: now.toISOString(),
        days: 28,
      },
      visitors: {
        today: todayVisitorIds.size,
        period: recentVisitorIds.size,
        total: allVisitorIds.size,
      },
      signups: {
        today: todayAccounts,
        period: recentAccounts,
        total: totalAccounts,
      },
      chat: {
        conversations: {
          today: num(todayData, 'totalConversations'),
          period: periodData.totalConversations ?? 0,
          total: num(global, 'totalConversations'),
        },
        messages: {
          today: num(todayData, 'totalMessages'),
          period: periodData.totalMessages ?? 0,
          total: num(global, 'totalMessages'),
        },
        cost: {
          today: costFrom(todayData),
          period: costFrom(periodData),
          total: costFrom(global),
        },
      },
      // Monthly spending for the cap progress bar. Cap value included
      // so the frontend stays in sync if we change it in pricing.ts.
      spending: {
        month: monthlyCost,
        cap: MONTHLY_COST_CAP,
      },
    })
  },
)
