import { Wordmark } from "./Wordmark";

const NAV = ["Search providers", "Find care", "For providers", "Company"];

export function SiteHeader() {
  return (
    <header className="w-full bg-mint">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-5">
        <div className="flex min-w-0 items-center gap-8">
          <Wordmark />
          <nav className="hidden items-center gap-6 lg:flex">
            {NAV.map((item) => (
              <span
                key={item}
                className="cursor-default whitespace-nowrap text-sm font-medium text-ink"
              >
                {item}
              </span>
            ))}
          </nav>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <span className="cursor-default rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink">
            My portal
          </span>
          <span className="cursor-default rounded-full bg-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-700">
            Join as a provider
          </span>
        </div>
      </div>
    </header>
  );
}
