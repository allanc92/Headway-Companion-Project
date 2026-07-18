import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function PinIcon(props: IconProps) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function CardIcon(props: IconProps) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M6.5 14.5h4" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function CalculatorIcon(props: IconProps) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
      <path d="M8 7.5h8" />
      <path d="M8 11h.01M12 11h.01M16 11h.01" />
      <path d="M8 15h.01M12 15h.01M16 15h.01" />
      <path d="M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  );
}

export function FeatherIcon(props: IconProps) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M20 4c-3.5 0-9 1.6-11.5 6.5C6.8 13.6 6 17 6 18l9-9" />
      <path d="M6 18c1 0 4.4-.8 7.5-2.5" />
      <path d="M4 20l3-2" />
    </svg>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="M9.5 12l1.8 1.8L15 10" />
    </svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8.5a3.5 3.5 0 0 0 3.5 3.5A3.5 3.5 0 0 0 12 15.5 3.5 3.5 0 0 0 8.5 12 3.5 3.5 0 0 0 12 8.5Z" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function LifebuoyIcon(props: IconProps) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M5.8 5.8l3.9 3.9M14.3 14.3l3.9 3.9M18.2 5.8l-3.9 3.9M9.7 14.3l-3.9 3.9" />
    </svg>
  );
}

export function GripIcon(props: IconProps) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="M14 6l4 4" />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M12 20s-7-4.4-7-9.5A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.5C19 15.6 12 20 12 20Z" />
    </svg>
  );
}

export function MicrophoneIcon(props: IconProps) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <rect x="8" y="3" width="8" height="12" rx="4" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" />
    </svg>
  );
}
