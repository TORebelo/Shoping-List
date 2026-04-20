import { COLOR_POOL, type Color } from "./types";

const INVITE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function generateInviteCode(): string {
  const length = 6 + Math.floor(Math.random() * 3);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)];
  }
  return out;
}

export function pickNextColor(taken: readonly string[]): Color {
  const takenSet = new Set(taken);
  for (const c of COLOR_POOL) {
    if (!takenSet.has(c)) return c;
  }
  return COLOR_POOL[0];
}

export function validateItemName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 80;
}

export function validateQuantity(q: string): boolean {
  return q.length <= 20;
}

export function defaultListTitle(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `Compras de ${y}-${m}-${d}`;
}
