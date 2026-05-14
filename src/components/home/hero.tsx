export function Hero() {
  return (
    <section className="bg-stone-100 py-16 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <img
          src="/images/judith.png"
          alt="Judith Orloff"
          className="w-40 h-40 rounded-full object-cover mx-auto mb-6 shadow-md"
        />
        <h1 className="text-3xl font-normal text-gray-900 mb-6">
          The Archive of Judith Orloff
        </h1>
        <div className="text-gray-700 text-lg leading-relaxed max-w-2xl mx-auto space-y-4">
          <p>
            Judith Orloff, M.Ed., was an educator, author, and leadership coach
            based in Boulder, Colorado. She founded the Radical Love Foundation
            and created the CHOICES: MBL program, dedicating her career to helping
            people take responsibility for their own experience and create
            meaningful change. This site is an archive of her writings, teachings,
            and documents.
          </p>
        </div>
      </div>
    </section>
  )
}
