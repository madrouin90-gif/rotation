const formatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Formate une date en français avec "1er" pour le premier jour du mois. */
export function formatDateFr(isoDate: string): string {
  const date = new Date(isoDate);
  const day = date.getDate();
  const parts = formatter.formatToParts(date);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const dayLabel = day === 1 ? "1er" : String(day);
  return `${dayLabel} ${month} ${year}`;
}

export function daysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

export function isShareNew(addedAt: string, newBadgeDays: number): boolean {
  if (newBadgeDays <= 0) return false;
  return daysSince(addedAt) < newBadgeDays;
}

// TODO(revue): rendre configurable par groupe si demandé — pour l'instant fixe pour tous.
export const STALE_SLOT_DAYS = 30;

export function isShareStale(addedAt: string): boolean {
  return daysSince(addedAt) >= STALE_SLOT_DAYS;
}
