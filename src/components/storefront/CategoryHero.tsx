export function CategoryHero({ name, description, count }: { name: string; description: string | null; count: number }) {
  return (
    <div className="border-b border-ink-800 pb-8">
      <p className="eyebrow">{count} {count === 1 ? "piece" : "pieces"}</p>
      <h1 className="mt-3 font-display text-4xl italic text-ink-50 sm:text-5xl">{name}</h1>
      {description && <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-400">{description}</p>}
    </div>
  );
}
