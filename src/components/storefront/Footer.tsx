export function Footer() {
  return (
    <footer className="ledger-rule mt-24 border-ink-800">
      <div className="mx-auto max-w-7xl px-6 py-10 text-xs text-ink-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono">VAULT © {new Date().getFullYear()}  catalogue</p>
          <p className="font-mono">Stock and pricing computed server side, always.</p>
        </div>
      </div>
    </footer>
  );
}
