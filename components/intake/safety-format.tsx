import type { ReactNode } from "react";
import { CRISIS_RESOURCES } from "@/lib/copy";

/**
 * Emphasize a crisis phone number within a line of copy: bold, and optionally a
 * tel:/sms: link. Only the exact number token is styled (so "24/7" and other
 * incidental digits stay plain), which keeps the surrounding text reading as
 * ordinary conversational prose.
 */
export function boldNumber(
  text: string,
  number: string,
  href?: string,
): ReactNode {
  const index = text.indexOf(number);
  if (index === -1) return text;

  const before = text.slice(0, index);
  const after = text.slice(index + number.length);
  const strong = <strong className="font-semibold text-ink">{number}</strong>;

  return (
    <>
      {before}
      {href ? (
        <a href={href} className="text-forest transition-colors hover:text-forest-700">
          {strong}
        </a>
      ) : (
        strong
      )}
      {after}
    </>
  );
}

/**
 * Render woven safety prose: any `{988}`-style token becomes a bold, tappable
 * number (href resolved from CRISIS_RESOURCES) while everything else stays plain
 * text, so the whole thing reads as one continuous sentence from Huey.
 */
export function renderWeave(template: string): ReactNode {
  return template.split(/(\{\d+\})/g).map((part, i) => {
    const match = part.match(/^\{(\d+)\}$/);
    if (!match) return <span key={i}>{part}</span>;
    const number = match[1];
    const href = CRISIS_RESOURCES.find((r) => r.number === number)?.href;
    return <span key={i}>{boldNumber(number, number, href)}</span>;
  });
}
