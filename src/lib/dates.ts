const formatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Formate une date+heure en français avec "1er" pour le premier jour du mois. */
export function formatDateFr(isoDate: string): string {
  const date = new Date(isoDate);
  const day = date.getDate();
  const parts = formatter.formatToParts(date);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const dayLabel = day === 1 ? "1er" : String(day);
  return `${dayLabel} ${month} ${year}, ${timeFormatter.format(date)}`;
}

const dateOnlyFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Clé stable (jour civil local) pour regrouper des partages par date, ex. dans le tri "Par date". */
export function dateGroupKey(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Libellé de section pour un groupe de date : "Aujourd'hui", "Hier", ou la date complète. */
export function formatDateGroupLabel(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Aujourd'hui";
  if (isSameDay(date, yesterday)) return "Hier";

  const day = date.getDate();
  const parts = dateOnlyFormatter.formatToParts(date);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const dayLabel = day === 1 ? "1er" : String(day);
  return `${dayLabel} ${month} ${year}`;
}

/** Heure seule (le groupe de date affiche déjà le jour) — ex. dans les listes du tri "Par date". */
export function formatTimeFr(isoDate: string): string {
  return timeFormatter.format(new Date(isoDate));
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
