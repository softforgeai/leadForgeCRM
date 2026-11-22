import { describe, expect, it } from "vitest";
import { csvCell, mapHeaders, parseCsv, toCsv } from "./csv";

describe("parseCsv", () => {
  it("parses simple rows", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles quoted fields with commas, quotes and newlines", () => {
    expect(parseCsv('name,notes\n"Lee, Jo","said ""hi""\nthen left"\n')).toEqual([
      ["name", "notes"],
      ["Lee, Jo", 'said "hi"\nthen left'],
    ]);
  });

  it("handles CRLF, a BOM, and a missing trailing newline", () => {
    expect(parseCsv("﻿a,b\r\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("drops blank lines", () => {
    expect(parseCsv("a\n\n1\n,\n")).toEqual([["a"], ["1"]]);
  });
});

describe("csvCell", () => {
  it("neutralises spreadsheet formulas (CSV injection)", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe("\"'=HYPERLINK(\"\"http://evil\"\")\"");
    expect(csvCell("+1 555")).toBe("'+1 555");
    expect(csvCell("-10")).toBe("'-10");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("quotes cells containing separators", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "x"')).toBe('"say ""x"""');
  });

  it("renders null and undefined as empty", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("round-trips through parseCsv", () => {
    const rows = [
      ["Name", "Notes"],
      ["Lee, Jo", 'line1\n"quoted"'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});

describe("mapHeaders", () => {
  it("matches common header spellings", () => {
    expect(mapHeaders(["Full Name", "E-mail Address", "Company Name", "Deal Value", "Lead Source"])).toEqual({
      name: 0,
      email: 1,
      company: 2,
      value: 3,
      source: 4,
    });
  });
});
