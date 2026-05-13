import { type SoftaDocument } from '../../lib/documents'
import { DocumentCard } from './document-card'

export function HorizontalSection({
  title,
  docs,
  favorites,
  onToggleFavorite,
}: {
  title: string
  docs: SoftaDocument[]
  favorites: Set<string>
  onToggleFavorite: (docId: string) => void
}) {
  if (docs.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="text-lg font-medium text-gray-900 mb-3">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {docs.map((doc) => (
          <div key={doc.id} className="w-44 flex-shrink-0 snap-start">
            <DocumentCard
              doc={doc}
              isFav={favorites.has(doc.id)}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
