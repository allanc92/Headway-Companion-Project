/*
  Recreated wordmark for demo purposes only — an original, copyright-safe mark
  approximating Headway's lockup (rounded green mark + editorial word).
*/
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="var(--color-forest)" />
        <path
          d="M9 21c0-6 3.5-10 8-10 2.2 0 3.6 1.1 3.6 2.8 0 3.6-6.6 3.2-6.6 7.2"
          fill="none"
          stroke="#e8f4ee"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="21.5" cy="11.5" r="1.7" fill="#9fe3c0" />
      </svg>
      <span className="text-[1.35rem] font-semibold tracking-tight text-forest">
        Headway
      </span>
    </span>
  );
}
