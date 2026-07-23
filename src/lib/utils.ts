import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ISO 3166-1 alpha-2 code (e.g. "US") -> flag emoji, via the regional indicator
// symbol trick (each letter A-Z maps to a Unicode regional indicator letter).
export function countryFlagEmoji(countryCode: string | undefined): string {
  if (!countryCode || countryCode.length !== 2) return "";
  const code = countryCode.toUpperCase();
  const A = 0x1f1e6;
  const chars = [...code].map((c) => A + (c.charCodeAt(0) - 65));
  if (chars.some((c) => c < A || c > A + 25)) return "";
  return String.fromCodePoint(...chars);
}
