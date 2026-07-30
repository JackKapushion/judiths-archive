import reviews from '../../functions/data/document-reviews.json'

export interface OutlineSection {
  title: string
  pages: string
  description: string
}

interface ReviewEntry {
  id: string
  outline?: OutlineSection[]
  pageCount?: number
}

const reviewsData = reviews as ReviewEntry[]

export function getDocumentOutline(docId: string): OutlineSection[] {
  const review = reviewsData.find(r => r.id === docId)
  return review?.outline ?? []
}

export function getPageCount(docId: string): number | undefined {
  const review = reviewsData.find(r => r.id === docId)
  return review?.pageCount
}

export function getFirstPage(pages: string): number {
  const match = pages.match(/\d+/)
  return match ? Number(match[0]) : 1
}
