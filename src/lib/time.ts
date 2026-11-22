/** Timezone helpers without a date library. */

export const TZ_COOKIE = "lf_tz";

export function isValidTimeZone(tz: string | undefined): tz is string {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Offset of `tz` from UTC at `instant`, in milliseconds (positive east of UTC). */
function offsetMs(tz: string, instant: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** The instant the current day ends (next local midnight) in `tz`. */
export function endOfToday(tz: string, now = Date.now()): Date {
  const local = new Date(now + offsetMs(tz, now));
  const nextMidnightLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1);
  // Two passes handle days where the offset changes (DST).
  let guess = nextMidnightLocal - offsetMs(tz, nextMidnightLocal);
  guess = nextMidnightLocal - offsetMs(tz, guess);
  return new Date(guess);
}

/** The instant the current day started (local midnight) in `tz`. */
export function startOfToday(tz: string, now = Date.now()): Date {
  return new Date(endOfToday(tz, now).getTime() - 24 * 60 * 60 * 1000);
}
