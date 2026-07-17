"use client";

const PALETTES = [
  { bg: "#dff2e7", accent: "#6fb2a6", shirt: "#14603b", skin: "#c98567" },
  { bg: "#dcebf7", accent: "#9fb191", shirt: "#2f5a86", skin: "#b9785f" },
  { bg: "#f3ead7", accent: "#e2ad4c", shirt: "#1b8a5a", skin: "#d69a78" },
  { bg: "#f4dfd8", accent: "#e2836a", shirt: "#0f4d2f", skin: "#a8644f" },
  { bg: "#e7efe5", accent: "#9fb191", shirt: "#14603b", skin: "#8f5d49" },
  { bg: "#e5f1ef", accent: "#6fb2a6", shirt: "#1c1d1a", skin: "#c98f71" },
];

function hashSeed(seed: string): number {
  return Array.from(seed).reduce((hash, char) => hash + char.charCodeAt(0), 0);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`;
}

export function ProviderAvatar({
  name,
  seed,
  className = "",
}: {
  name: string;
  seed: string;
  className?: string;
}) {
  const hash = hashSeed(seed || name);
  const palette = PALETTES[hash % PALETTES.length];
  const variant = hash % 4;
  const gradientId = `provider-avatar-${(seed || name).replace(/[^a-z0-9]/gi, "-")}`;
  const hairColor = variant % 2 === 0 ? "#3f332b" : "#5b3a2e";
  const shoulderPath =
    variant < 2
      ? "M50 95c17 0 32 8 38 22H12c6-14 21-22 38-22Z"
      : "M50 94c19 0 34 9 40 24H10c6-15 21-24 40-24Z";

  return (
    <svg
      role="img"
      aria-label={`Warm illustrated portrait for ${name}`}
      viewBox="0 0 100 120"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.bg} />
          <stop offset="100%" stopColor="#fbfefd" />
        </linearGradient>
      </defs>
      <rect width="100" height="120" rx="24" fill={`url(#${gradientId})`} />
      <circle cx="18" cy="24" r="16" fill={palette.accent} opacity="0.3" />
      <circle cx="82" cy="28" r="22" fill="#ffffff" opacity="0.42" />
      <path d="M7 87c22-10 56-10 86 5v28H7V87Z" fill="#ffffff" opacity="0.36" />
      <path d={shoulderPath} fill={palette.shirt} />
      <circle cx="50" cy="56" r="24" fill={hairColor} />
      <circle cx="50" cy="61" r="19" fill={palette.skin} />
      <path
        d={
          variant % 2 === 0
            ? "M30 55c5-18 23-27 40-13 0 11-11 17-24 17-7 0-12-1-16-4Z"
            : "M31 53c9-17 31-19 39 0-8 2-16 3-25 3-5 0-10-1-14-3Z"
        }
        fill={hairColor}
      />
      <path
        d="M42 68c4 3 12 3 16 0"
        stroke="#5f3d31"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.52"
      />
      <circle cx="43" cy="59" r="1.6" fill="#3f332b" opacity="0.7" />
      <circle cx="57" cy="59" r="1.6" fill="#3f332b" opacity="0.7" />
      <text
        x="50"
        y="108"
        textAnchor="middle"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="10"
        fontWeight="700"
        letterSpacing="1.5"
        fill="#fbfefd"
        opacity="0.9"
      >
        {initials(name).toUpperCase()}
      </text>
    </svg>
  );
}
