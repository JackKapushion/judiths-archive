export interface SoftaDocument {
  id: string
  title: string
  filename: string
  type: 'pdf' | 'image'
  category: string
}

// Scanned documents from two batches:
// - 2024-06-14 batch (SKM_300i2406140...)
// - 2025-01-10 batch (SKM_300i2501100...)
// Titles are placeholders - Jack can update these with real titles later.
export const documents: SoftaDocument[] = [
  // 2024-06-14 batch
  { id: 'scan-2406-0838', title: 'Document 1 (Jun 2024)', filename: 'SKM_300i24061408380.pdf', type: 'pdf', category: 'Letters & Correspondence' },
  { id: 'scan-2406-0840', title: 'Document 2 (Jun 2024)', filename: 'SKM_300i24061408400.pdf', type: 'pdf', category: 'Letters & Correspondence' },
  { id: 'scan-2406-0841', title: 'Document 3 (Jun 2024)', filename: 'SKM_300i24061408410.pdf', type: 'pdf', category: 'Letters & Correspondence' },
  { id: 'scan-2406-0844', title: 'Document 4 (Jun 2024)', filename: 'SKM_300i24061408440.pdf', type: 'pdf', category: 'Teaching Materials' },
  { id: 'scan-2406-0847', title: 'Document 5 (Jun 2024)', filename: 'SKM_300i24061408470.pdf', type: 'pdf', category: 'Teaching Materials' },
  { id: 'scan-2406-0852', title: 'Document 6 (Jun 2024)', filename: 'SKM_300i24061408520.pdf', type: 'pdf', category: 'Teaching Materials' },
  { id: 'scan-2406-0854', title: 'Document 7 (Jun 2024)', filename: 'SKM_300i24061408540.pdf', type: 'pdf', category: 'Personal Writing' },
  { id: 'scan-2406-0857', title: 'Document 8 (Jun 2024)', filename: 'SKM_300i24061408570.pdf', type: 'pdf', category: 'Personal Writing' },
  { id: 'scan-2406-0901', title: 'Document 9 (Jun 2024)', filename: 'SKM_300i24061409010.pdf', type: 'pdf', category: 'Personal Writing' },
  { id: 'scan-2406-0903', title: 'Document 10 (Jun 2024)', filename: 'SKM_300i24061409030.pdf', type: 'pdf', category: 'CHOICES Program' },
  { id: 'scan-2406-0908', title: 'Document 11 (Jun 2024)', filename: 'SKM_300i24061409080.pdf', type: 'pdf', category: 'CHOICES Program' },

  // 2025-01-10 batch
  { id: 'scan-2501-0808', title: 'Document 12 (Jan 2025)', filename: 'SKM_300i25011008081.pdf', type: 'pdf', category: 'CHOICES Program' },
  { id: 'scan-2501-0812', title: 'Document 13 (Jan 2025)', filename: 'SKM_300i25011008120.pdf', type: 'pdf', category: 'CHOICES Program' },
  { id: 'scan-2501-0816', title: 'Document 14 (Jan 2025)', filename: 'SKM_300i25011008160.pdf', type: 'pdf', category: 'CHOICES Program' },
  { id: 'scan-2501-0817', title: 'Document 15 (Jan 2025)', filename: 'SKM_300i25011008170.pdf', type: 'pdf', category: 'CHOICES Program' },
  { id: 'scan-2501-0822', title: 'Document 16 (Jan 2025)', filename: 'SKM_300i25011008220.pdf', type: 'pdf', category: 'Letters & Correspondence' },
  { id: 'scan-2501-0826', title: 'Document 17 (Jan 2025)', filename: 'SKM_300i25011008260.pdf', type: 'pdf', category: 'Letters & Correspondence' },
  { id: 'scan-2501-0828', title: 'Document 18 (Jan 2025)', filename: 'SKM_300i25011008280.pdf', type: 'pdf', category: 'Letters & Correspondence' },
  { id: 'scan-2501-0829', title: 'Document 19 (Jan 2025)', filename: 'SKM_300i25011008290.pdf', type: 'pdf', category: 'Teaching Materials' },
  { id: 'scan-2501-0831', title: 'Document 20 (Jan 2025)', filename: 'SKM_300i25011008310.pdf', type: 'pdf', category: 'Teaching Materials' },
  { id: 'scan-2501-0833', title: 'Document 21 (Jan 2025)', filename: 'SKM_300i25011008330.pdf', type: 'pdf', category: 'Teaching Materials' },
  { id: 'scan-2501-0835', title: 'Document 22 (Jan 2025)', filename: 'SKM_300i25011008351.pdf', type: 'pdf', category: 'Teaching Materials' },
  { id: 'scan-2501-0836', title: 'Document 23 (Jan 2025)', filename: 'SKM_300i25011008360.pdf', type: 'pdf', category: 'Personal Writing' },
  { id: 'scan-2501-0840', title: 'Document 24 (Jan 2025)', filename: 'SKM_300i25011008400.pdf', type: 'pdf', category: 'Personal Writing' },
  { id: 'scan-2501-0841', title: 'Document 25 (Jan 2025)', filename: 'SKM_300i25011008410.pdf', type: 'pdf', category: 'Personal Writing' },
  { id: 'scan-2501-0845', title: 'Document 26 (Jan 2025)', filename: 'SKM_300i25011008450.pdf', type: 'pdf', category: 'Personal Writing' },
  { id: 'scan-2501-0847', title: 'Document 27 (Jan 2025)', filename: 'SKM_300i25011008470.pdf', type: 'pdf', category: 'Personal Writing' },

  // Screenshots
  { id: 'screenshot-0508', title: 'Screenshot 1 (Aug 2024)', filename: 'Screenshot 2024-08-03 at 5.08.32 PM.png', type: 'image', category: 'Photos & Screenshots' },
  { id: 'screenshot-0527', title: 'Screenshot 2 (Aug 2024)', filename: 'Screenshot 2024-08-03 at 5.27.22 PM.png', type: 'image', category: 'Photos & Screenshots' },
]

export function getDocumentById(id: string): SoftaDocument | undefined {
  return documents.find((doc) => doc.id === id)
}

const categories: { name: string; description: string }[] = [
  {
    name: 'Letters & Correspondence',
    description: 'Throughout her career, Judith maintained a rich network of professional and personal relationships. She wrote extensively to colleagues in the education and leadership development communities, to former students who had gone on to build their own practices, and to friends and family. These letters capture her voice in its most direct form - encouraging, challenging, and always deeply personal. Many of them trace the evolution of her thinking over decades, from her early teaching days through the founding of the Radical Love Foundation.',
  },
  {
    name: 'Teaching Materials',
    description: 'Judith earned her M.Ed. with a focus on experiential education and spent years developing curricula that bridged leadership theory with hands-on learning. She taught at institutions including the Vermont Institute of Community Involvement and Burlington College, where she designed workshops on conflict resolution, group dynamics, and organizational change. These documents include lesson plans, workshop outlines, training manuals, and course syllabi that reflect her belief that real learning happens through experience, not lecture.',
  },
  {
    name: 'Personal Writing',
    description: 'Beyond her professional work, Judith was a prolific and deeply reflective writer. She kept journals throughout her life and wrote essays on topics ranging from Kabbalistic philosophy to the nature of personal responsibility. Much of this writing informed her published works, including The Power of the Sacred Living Letters: The Kabbalah Book of Change. These unpublished pieces offer a window into how she processed the world - always searching, always questioning, always pushing toward something more honest.',
  },
  {
    name: 'CHOICES Program',
    description: 'CHOICES: MBL (Managing by Leadership) was the program Judith created and considered her life\'s work. It was a comprehensive framework for personal and organizational transformation, drawing on her background in education, her study of Kabbalistic teachings, and years of hands-on facilitation. The program covered stress management, conflict resolution, communication skills, and experiential learning techniques. She ran CHOICES workshops for corporate teams, nonprofits, and community groups, and trained other facilitators to carry the work forward. These documents include program guides, participant workbooks, facilitator notes, and presentation materials.',
  },
  {
    name: 'Photos & Screenshots',
    description: 'A collection of photographs, clippings, and visual materials from different periods of Judith\'s life and career. These images capture moments from her teaching, her travels, her time with family, and the community she built around her work.',
  },
]

export function getCategories(): { name: string; description: string }[] {
  return categories.filter((cat) =>
    documents.some((doc) => doc.category === cat.name)
  )
}

export function getDocumentsByCategory(category: string): SoftaDocument[] {
  return documents.filter((doc) => doc.category === category)
}

export function getThumbnailPath(doc: SoftaDocument): string {
  if (doc.type === 'image') {
    return `/documents/${doc.filename}`
  }
  const name = doc.filename.replace(/\.pdf$/i, '')
  return `/thumbnails/${name}.png`
}
