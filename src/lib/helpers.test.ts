import { describe, expect, it } from "vitest";
import { dbErrorMessage } from "./action-result";
import { centsToInput, formatMoney, sanitizeSearch } from "./format";
import { safeNextPath } from "./safe-redirect";
import { endOfToday, isValidTimeZone, startOfToday } from "./time";

describe("safeNextPath (open-redirect protection)", () => {
  it("allows local paths", () => {
    expect(safeNextPath("/app/leads?x=1")).toBe("/app/leads?x=1");
  });
  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, 42])(
    "falls back for %j",
    (input) => {
      expect(safeNextPath(input)).toBe("/app");
    },
  );
});

describe("sanitizeSearch (filter-injection protection)", () => {
  it("strips characters that change PostgREST filter meaning", () => {
    expect(sanitizeSearch("acme),role.eq.owner,(name")).toBe("acme  role.eq.owner  name");
  });
  it("escapes LIKE wildcards", () => {
    expect(sanitizeSearch("100%_off")).toBe("100\\%\\_off");
  });
  it("limits length", () => {
    expect(sanitizeSearch("a".repeat(500))).toHaveLength(100);
  });
});

describe("money formatting", () => {
  it("formats cents as whole dollars", () => {
    expect(formatMoney(250050)).toBe("$2,501");
  });
  it("converts cents back to an input value", () => {
    expect(centsToInput(0)).toBe("");
    expect(centsToInput(250000)).toBe("2500");
    expect(centsToInput(250050)).toBe("2500.50");
  });
});

describe("timezone helpers", () => {
  it("validates timezone names", () => {
    expect(isValidTimeZone("Asia/Dhaka")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
  });

  it("computes end of today in a fixed-offset zone", () => {
    // 2026-11-22 20:00 UTC is 2026-11-23 02:00 in Dhaka (UTC+6), so the day ends at 2026-11-23 18:00 UTC.
    const now = Date.UTC(2026, 10, 22, 20, 0);
    expect(endOfToday("Asia/Dhaka", now).toISOString()).toBe("2026-11-23T18:00:00.000Z");
    expect(startOfToday("Asia/Dhaka", now).toISOString()).toBe("2026-11-22T18:00:00.000Z");
  });

  it("handles a DST transition day", () => {
    // 2026-03-08 is the US spring-forward day; New York midnight on 03-09 is 04:00 UTC (EDT).
    const now = Date.UTC(2026, 2, 8, 15, 0);
    expect(endOfToday("America/New_York", now).toISOString()).toBe("2026-03-09T04:00:00.000Z");
  });
});

describe("dbErrorMessage", () => {
  it("passes through known, user-facing errors", () => {
    expect(dbErrorMessage({ message: "the owner cannot be removed" }, "x")).toBe("The owner cannot be removed.");
  });
  it("hides raw database errors", () => {
    expect(dbErrorMessage({ message: 'relation "secret_table" does not exist', code: "42P01" }, "Fallback")).toBe(
      "Fallback",
    );
  });
  it("maps permission errors", () => {
    expect(dbErrorMessage({ message: "permission denied", code: "42501" }, "x")).toBe(
      "You don't have permission to do that.",
    );
  });
});
