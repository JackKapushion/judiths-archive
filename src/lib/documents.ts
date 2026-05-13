export interface SoftaDocument {
  id: string
  title: string
  filename: string
  type: 'pdf' | 'image'
}

// Scanned documents from two batches:
// - 2024-06-14 batch (SKM_300i2406140...)
// - 2025-01-10 batch (SKM_300i2501100...)
// Titles are placeholders - Jack can update these with real titles later.
export const documents: SoftaDocument[] = [
  // 2024-06-14 batch
  { id: 'scan-2406-0838', title: 'Document 1 (Jun 2024)', filename: 'SKM_300i24061408380.pdf', type: 'pdf' },
  { id: 'scan-2406-0840', title: 'Document 2 (Jun 2024)', filename: 'SKM_300i24061408400.pdf', type: 'pdf' },
  { id: 'scan-2406-0841', title: 'Document 3 (Jun 2024)', filename: 'SKM_300i24061408410.pdf', type: 'pdf' },
  { id: 'scan-2406-0844', title: 'Document 4 (Jun 2024)', filename: 'SKM_300i24061408440.pdf', type: 'pdf' },
  { id: 'scan-2406-0847', title: 'Document 5 (Jun 2024)', filename: 'SKM_300i24061408470.pdf', type: 'pdf' },
  { id: 'scan-2406-0852', title: 'Document 6 (Jun 2024)', filename: 'SKM_300i24061408520.pdf', type: 'pdf' },
  { id: 'scan-2406-0854', title: 'Document 7 (Jun 2024)', filename: 'SKM_300i24061408540.pdf', type: 'pdf' },
  { id: 'scan-2406-0857', title: 'Document 8 (Jun 2024)', filename: 'SKM_300i24061408570.pdf', type: 'pdf' },
  { id: 'scan-2406-0901', title: 'Document 9 (Jun 2024)', filename: 'SKM_300i24061409010.pdf', type: 'pdf' },
  { id: 'scan-2406-0903', title: 'Document 10 (Jun 2024)', filename: 'SKM_300i24061409030.pdf', type: 'pdf' },
  { id: 'scan-2406-0908', title: 'Document 11 (Jun 2024)', filename: 'SKM_300i24061409080.pdf', type: 'pdf' },

  // 2025-01-10 batch
  { id: 'scan-2501-0808', title: 'Document 12 (Jan 2025)', filename: 'SKM_300i25011008081.pdf', type: 'pdf' },
  { id: 'scan-2501-0812', title: 'Document 13 (Jan 2025)', filename: 'SKM_300i25011008120.pdf', type: 'pdf' },
  { id: 'scan-2501-0816', title: 'Document 14 (Jan 2025)', filename: 'SKM_300i25011008160.pdf', type: 'pdf' },
  { id: 'scan-2501-0817', title: 'Document 15 (Jan 2025)', filename: 'SKM_300i25011008170.pdf', type: 'pdf' },
  { id: 'scan-2501-0822', title: 'Document 16 (Jan 2025)', filename: 'SKM_300i25011008220.pdf', type: 'pdf' },
  { id: 'scan-2501-0826', title: 'Document 17 (Jan 2025)', filename: 'SKM_300i25011008260.pdf', type: 'pdf' },
  { id: 'scan-2501-0828', title: 'Document 18 (Jan 2025)', filename: 'SKM_300i25011008280.pdf', type: 'pdf' },
  { id: 'scan-2501-0829', title: 'Document 19 (Jan 2025)', filename: 'SKM_300i25011008290.pdf', type: 'pdf' },
  { id: 'scan-2501-0831', title: 'Document 20 (Jan 2025)', filename: 'SKM_300i25011008310.pdf', type: 'pdf' },
  { id: 'scan-2501-0833', title: 'Document 21 (Jan 2025)', filename: 'SKM_300i25011008330.pdf', type: 'pdf' },
  { id: 'scan-2501-0835', title: 'Document 22 (Jan 2025)', filename: 'SKM_300i25011008351.pdf', type: 'pdf' },
  { id: 'scan-2501-0836', title: 'Document 23 (Jan 2025)', filename: 'SKM_300i25011008360.pdf', type: 'pdf' },
  { id: 'scan-2501-0840', title: 'Document 24 (Jan 2025)', filename: 'SKM_300i25011008400.pdf', type: 'pdf' },
  { id: 'scan-2501-0841', title: 'Document 25 (Jan 2025)', filename: 'SKM_300i25011008410.pdf', type: 'pdf' },
  { id: 'scan-2501-0845', title: 'Document 26 (Jan 2025)', filename: 'SKM_300i25011008450.pdf', type: 'pdf' },
  { id: 'scan-2501-0847', title: 'Document 27 (Jan 2025)', filename: 'SKM_300i25011008470.pdf', type: 'pdf' },

  // Screenshots
  { id: 'screenshot-0508', title: 'Screenshot 1 (Aug 2024)', filename: 'Screenshot 2024-08-03 at 5.08.32 PM.png', type: 'image' },
  { id: 'screenshot-0527', title: 'Screenshot 2 (Aug 2024)', filename: 'Screenshot 2024-08-03 at 5.27.22 PM.png', type: 'image' },
]

export function getDocumentById(id: string): SoftaDocument | undefined {
  return documents.find((doc) => doc.id === id)
}
