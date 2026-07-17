export function HeroArt() {
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-3xl bg-sand shadow-sm ring-1 ring-line">
      <svg
        viewBox="0 0 640 480"
        role="img"
        aria-label="Two people seated in a supportive therapy session"
        className="h-full w-full"
      >
        <rect width="640" height="480" fill="#efece4" />
        <circle cx="520" cy="72" r="92" fill="#d6ebe0" />
        <circle cx="94" cy="392" r="132" fill="#e8f4ee" />
        <path d="M80 102c86-52 199-61 314-25 87 27 129 12 176-15v334H80V102Z" fill="#f7f5f0" />
        <path d="M70 384c94-31 190-42 286-33 72 7 139 28 214 18v55H70v-40Z" fill="#d6ebe0" />

        <rect x="238" y="127" width="166" height="144" rx="30" fill="#9fb191" opacity=".35" />
        <rect x="272" y="99" width="142" height="112" rx="26" fill="#e8f4ee" />
        <path d="M302 160c26-20 52-20 78 0" fill="none" stroke="#14603b" strokeWidth="8" strokeLinecap="round" />
        <circle cx="300" cy="143" r="7" fill="#14603b" />
        <circle cx="382" cy="143" r="7" fill="#14603b" />

        <ellipse cx="206" cy="405" rx="128" ry="26" fill="#e4e1d8" />
        <ellipse cx="456" cy="405" rx="122" ry="26" fill="#e4e1d8" />

        <path d="M122 259c-22 34-29 69-23 104h148c6-48-9-86-45-115l-80 11Z" fill="#14603b" />
        <path d="M154 172c-24 8-37 28-34 52 3 29 26 48 56 43 27-5 43-29 37-57-6-27-31-47-59-38Z" fill="#5b3f31" />
        <circle cx="169" cy="223" r="38" fill="#b87559" />
        <path d="M130 218c7-35 36-61 81-31 4-26-23-50-58-41-32 8-48 35-44 61l21 11Z" fill="#5b3f31" />
        <path d="M113 310c34 10 63 5 87-17" fill="none" stroke="#f0c2a9" strokeWidth="20" strokeLinecap="round" />
        <path d="M199 294c23 18 52 23 86 11" fill="none" stroke="#f0c2a9" strokeWidth="18" strokeLinecap="round" />
        <path d="M109 363h80l-13 67h-43l-24-67Z" fill="#e2836a" />
        <path d="M190 363h58l29 67h-44l-43-67Z" fill="#d9745e" />

        <path d="M418 244c-38 27-54 67-47 119h153c8-39-3-78-31-116l-75-3Z" fill="#e2836a" />
        <circle cx="452" cy="205" r="39" fill="#8f5d49" />
        <path d="M410 205c3-38 31-64 69-58 30 5 52 30 50 60-22-12-45-20-70-22-20-2-36 5-49 20Z" fill="#3d2b25" />
        <path d="M397 302c-35 23-69 31-102 24" fill="none" stroke="#8f5d49" strokeWidth="18" strokeLinecap="round" />
        <path d="M493 300c-22 21-49 30-80 28" fill="none" stroke="#8f5d49" strokeWidth="18" strokeLinecap="round" />
        <path d="M382 363h70l-29 67h-43l2-67Z" fill="#e2ad4c" />
        <path d="M456 363h72l-23 67h-45l-4-67Z" fill="#d89e3f" />

        <rect x="269" y="294" width="88" height="50" rx="25" fill="#e8f4ee" stroke="#14603b" strokeWidth="4" />
        <circle cx="300" cy="319" r="6" fill="#14603b" />
        <circle cx="327" cy="319" r="6" fill="#14603b" />
      </svg>
    </div>
  );
}
