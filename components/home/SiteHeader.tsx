import { Wordmark } from "./Wordmark";

const NAV = ["For individuals", "For therapists", "How it works", "About"];

export function SiteHeader() {
  return (
    <header className="w-full border-b border-line/70 bg-cream/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-8">
          <Wordmark />
          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => (
              <span
                key={item}
                className="cursor-default text-sm text-ink-soft transition-colors hover:text-ink"
              >
                {item}
              </span>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden cursor-default text-sm font-medium text-ink-soft sm:inline">
            Log in
          </span>
          <span className="cursor-default rounded-full bg-forest px-4 py-2 text-sm font-medium text-mint">
            Get started
          </span>
        </div>
      </div>
    </header>
  );
}
