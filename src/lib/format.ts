const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatMoney(cents: number): string {
  return currency.format(Math.round(cents / 100));
}

export function centsToInput(cents: number): string {
  return cents === 0 ? "" : (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return new Intl.DateTimeFormat("en-US", opts).format(new Date(iso));
}

export function formatRelative(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < hour) return rtf.format(Math.round(diff / minute), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hour), "hour");
  if (abs < 30 * day) return rtf.format(Math.round(diff / day), "day");
  return formatDate(iso);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/**
 * Makes user input safe to embed in a PostgREST `or=(...)` filter: removes
 * characters with filter meaning and escapes LIKE wildcards. Without this, a
 * search box can inject extra filter conditions.
 */
export function sanitizeSearch(input: string): string {
  return input
    .slice(0, 100)
    .replace(/[,()*:"\\]/g, " ")
    .replace(/[%_]/g, (m) => `\\${m}`)
    .trim();
}
