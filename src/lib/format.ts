/**
 * Format a Firestore Timestamp-like value into a short relative string
 * ("há 5 min", "ontem", "há 3 dias", "18 abr"). Forgiving of missing/invalid
 * input — returns empty string so callers don't have to guard.
 */
export function relativeTimePt(value: unknown): string {
  if (!value) return "";
  let date: Date;
  try {
    if (
      typeof value === "object" &&
      value !== null &&
      "toDate" in value &&
      typeof (value as { toDate?: () => Date }).toDate === "function"
    ) {
      date = (value as { toDate: () => Date }).toDate();
    } else if (value instanceof Date) {
      date = value;
    } else {
      return "";
    }
  } catch {
    return "";
  }
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const sec = Math.round(diffMs / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);

  if (sec < 60) return "agora";
  if (min < 60) return `há ${min} min`;
  if (hr < 24) return `há ${hr} h`;
  if (day === 1) return "ontem";
  if (day < 7) return `há ${day} dias`;
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
  });
}
