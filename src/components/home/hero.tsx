export function Hero() {
  return (
    <section className="bg-stone-100 py-16 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <img
          src="/images/judith.png"
          alt="Judith Orloff"
          className="w-40 h-40 rounded-full object-cover mx-auto mb-6 shadow-md"
        />
        <h1 className="text-3xl font-semibold text-gray-900 mb-3">
          Judith Orloff's Archive
        </h1>
        <p className="text-lg text-gray-600 max-w-xl mx-auto">
          A collection of writings, teachings, and documents from the life and
          work of Judith Orloff, M.Ed. - educator, author, and leadership coach.
        </p>
      </div>
    </section>
  )
}
