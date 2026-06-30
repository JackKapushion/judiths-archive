import type { ChatMessage } from '../components/chat/message-list'
import type { Conversation } from './conversations'
import { Timestamp } from 'firebase/firestore'

function hoursAgo(hours: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() - hours * 60 * 60 * 1000))
}

function daysAgo(days: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000))
}

export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'demo-1',
    userId: 'demo',
    title: 'What is the CHOICES program?',
    messageCount: 4,
    lastMessageAt: hoursAgo(1),
    createdAt: hoursAgo(2),
    isArchived: false,
  },
  {
    id: 'demo-2',
    userId: 'demo',
    title: 'Her views on leadership',
    messageCount: 2,
    lastMessageAt: hoursAgo(5),
    createdAt: hoursAgo(5),
    isArchived: false,
  },
  {
    id: 'demo-3',
    userId: 'demo',
    title: 'Radical Love Foundation background',
    messageCount: 4,
    lastMessageAt: daysAgo(1),
    createdAt: daysAgo(1),
    isArchived: false,
  },
  {
    id: 'demo-4',
    userId: 'demo',
    title: 'Kabbalah influences in her writing',
    messageCount: 2,
    lastMessageAt: daysAgo(3),
    createdAt: daysAgo(3),
    isArchived: false,
  },
  {
    id: 'demo-5',
    userId: 'demo',
    title: 'Burlington College teaching years',
    messageCount: 2,
    lastMessageAt: daysAgo(8),
    createdAt: daysAgo(8),
    isArchived: false,
  },
]

export const DEMO_MESSAGES: Record<string, ChatMessage[]> = {
  'demo-1': [
    {
      id: 'dm-1a',
      role: 'user',
      content: 'What was the CHOICES program? Can you give me an overview?',
    },
    {
      id: 'dm-1b',
      role: 'assistant',
      content: `CHOICES: MBL (Managing by Leadership) was the program Judith created and considered her life's work. It was a comprehensive framework for personal and organizational transformation.

The program drew on three main foundations: her background in experiential education, her study of Kabbalistic teachings, and years of hands-on facilitation work. It covered stress management, conflict resolution, communication skills, and experiential learning techniques.

She ran CHOICES workshops for corporate teams, nonprofits, and community groups, and also trained other facilitators to carry the work forward. The program materials include facilitator guides, participant workbooks, and presentation materials.

One of the core principles was that people need to take responsibility for their own experience - that meaningful change starts with personal accountability rather than waiting for external circumstances to shift.

Sources: Document 10 (Jun 2024), Document 11 (Jun 2024), Document 14 (Jan 2025)`,
    },
    {
      id: 'dm-1c',
      role: 'user',
      content: 'What kind of organizations did she work with?',
    },
    {
      id: 'dm-1d',
      role: 'assistant',
      content: `From the documents I can find, Judith worked with a range of organizations across sectors. Her CHOICES workshops were delivered to corporate teams looking to improve leadership and communication, nonprofits focused on community development, and various community groups.

She also had connections in the education world, having taught at the Vermont Institute of Community Involvement and Burlington College. Her workshops there focused on conflict resolution, group dynamics, and organizational change.

The program was designed to be adaptable - the core framework around personal responsibility and experiential learning could apply whether she was working with a corporate management team or a community nonprofit.

Sources: Document 4 (Jun 2024), Document 12 (Jan 2025)`,
    },
  ],
  'demo-2': [
    {
      id: 'dm-2a',
      role: 'user',
      content: 'What did Judith believe about leadership?',
    },
    {
      id: 'dm-2b',
      role: 'assistant',
      content: `Judith's view of leadership was deeply personal and experiential. She didn't see leadership as a position or title - she saw it as a way of being in the world.

A few key themes run through her writings on leadership:

Personal responsibility came first. She believed you couldn't lead others effectively until you took full ownership of your own experience, reactions, and growth. This was the foundation of the CHOICES program.

She valued experiential learning over lecture-based teaching. Her M.Ed. focused on this, and she designed all her programs around the idea that real understanding comes from doing, reflecting, and integrating - not from being told.

Conflict was generative, not something to avoid. Her workshops on conflict resolution treated disagreement as an opportunity for deeper understanding rather than a problem to eliminate.

She also drew heavily from Kabbalistic philosophy, particularly around the idea that authentic leadership requires both strength and vulnerability - what she connected to the concept of "radical love."

Sources: Document 5 (Jun 2024), Document 15 (Jan 2025), Document 16 (Jan 2025)`,
    },
  ],
  'demo-3': [
    {
      id: 'dm-3a',
      role: 'user',
      content: 'Tell me about the Radical Love Foundation',
    },
    {
      id: 'dm-3b',
      role: 'assistant',
      content: `The Radical Love Foundation was an organization Judith founded to carry forward her life's work in leadership development and personal transformation.

The foundation's name reflected a core concept in Judith's philosophy - that meaningful change, both personal and organizational, requires a kind of love that is honest, challenging, and deeply committed to growth. This wasn't a soft or sentimental idea for her. "Radical love" meant being willing to have difficult conversations, hold people accountable, and stay engaged even when it would be easier to walk away.

The foundation served as a vehicle for her CHOICES: MBL program and her broader educational work. It helped formalize and continue the workshops, training programs, and facilitation work she had been doing throughout her career.

Sources: Document 7 (Jun 2024), Document 23 (Jan 2025)`,
    },
    {
      id: 'dm-3c',
      role: 'user',
      content: 'Did she write about radical love specifically?',
    },
    {
      id: 'dm-3d',
      role: 'assistant',
      content: `Yes, the concept of radical love was woven throughout much of her personal writing. She also authored a book called "The Power of the Sacred Living Letters: The Kabbalah Book of Change," which connected her understanding of Kabbalistic teachings to practical ideas about love, responsibility, and transformation.

In her journals and unpublished essays, she explored what radical love meant in everyday practice - in relationships, in work, in community. For Judith, it wasn't an abstract spiritual idea. It was about showing up fully, being honest even when it was uncomfortable, and believing in people's capacity to grow.

Several of her personal letters to colleagues and former students also touch on these themes, often in a very direct and encouraging way. She would challenge people while simultaneously expressing deep faith in them.

Sources: Document 23 (Jan 2025), Document 24 (Jan 2025), Document 9 (Jun 2024)`,
    },
  ],
  'demo-4': [
    {
      id: 'dm-4a',
      role: 'user',
      content: 'How did Kabbalah influence her work?',
    },
    {
      id: 'dm-4b',
      role: 'assistant',
      content: `Kabbalistic philosophy was a significant influence on Judith's thinking and work, though she integrated it in a practical rather than purely theological way.

Her book "The Power of the Sacred Living Letters: The Kabbalah Book of Change" is the most direct expression of this influence. In it, she connected the Hebrew letters and their mystical significance to ideas about personal transformation and growth.

In her teaching and facilitation work, the Kabbalistic influence showed up more subtly. The idea that every person contains a spark of the divine - and the responsibility to nurture that spark - mapped onto her belief that everyone has the capacity for leadership and growth. The concept of tikkun olam (repairing the world) aligned with her emphasis on personal responsibility as a path to collective change.

Her journals show that she spent considerable time studying and reflecting on these teachings, integrating them with her background in experiential education to create something uniquely her own.

Sources: Document 24 (Jan 2025), Document 25 (Jan 2025), Document 9 (Jun 2024)`,
    },
  ],
  'demo-5': [
    {
      id: 'dm-5a',
      role: 'user',
      content: 'What did Judith teach at Burlington College?',
    },
    {
      id: 'dm-5b',
      role: 'assistant',
      content: `At Burlington College, Judith designed and taught workshops focused on conflict resolution, group dynamics, and organizational change. This was part of her broader career in experiential education.

She also taught at the Vermont Institute of Community Involvement, where she developed curricula that bridged leadership theory with hands-on learning. Her approach was distinctive - she didn't believe in lecture-based teaching. Everything was built around direct experience, reflection, and integration.

The teaching materials from this period include lesson plans, workshop outlines, training manuals, and course syllabi. They reflect her core philosophy that real learning happens through engagement rather than passive instruction.

Her M.Ed. focused specifically on experiential education, which gave an academic foundation to what she was already doing intuitively as a facilitator and teacher.

Sources: Document 4 (Jun 2024), Document 5 (Jun 2024), Document 19 (Jan 2025)`,
    },
  ],
}

export function isDemoConversation(id: string): boolean {
  return id.startsWith('demo-')
}
