/*
  Recreated wordmark for demo purposes only — an original, copyright-safe mark
  approximating Headway's lockup (rounded green mark + editorial word).
*/
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
        <path
          d="M4.2 17.2C2.9 9.8 8.2 3.1 15.8 2.7c7.5-.4 12.9 4.5 12.7 11.8-.2 8.1-6.9 14.1-14.8 13.3-4.8-.5-8.7-5.7-9.5-10.6Z"
          fill="var(--color-forest)"
        />
      </svg>
      <span className="text-[1.35rem] font-semibold tracking-tight text-forest">
        Headway
      </span>
    </span>
  );
}
