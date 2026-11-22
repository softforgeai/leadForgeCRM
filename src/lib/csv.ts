/**
 * Minimal RFC 4180 CSV parsing and writing. Handles quoted fields, escaped
 * quotes, CRLF line endings, and a UTF-8 BOM.
 */

export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully empty lines.
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/**
 * Escapes one cell. Cells starting with = + - @ (or tab/CR) are prefixed with
 * a quote so spreadsheet apps don't execute them as formulas (CSV injection).
 */
export function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Normalises header names: "E-mail Address" -> "emailaddress". */
export function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "fullname", "contactname", "contact", "leadname"],
  company: ["company", "companyname", "organization", "organisation", "business"],
  email: ["email", "emailaddress", "mail"],
  phone: ["phone", "phonenumber", "mobile", "tel", "telephone"],
  source: ["source", "leadsource", "channel"],
  value: ["value", "dealvalue", "amount", "estimatedvalue"],
  tags: ["tags", "labels"],
  notes: ["notes", "note", "comments", "description"],
};

/** Maps CSV headers to lead fields. Returns field -> column index. */
export function mapHeaders(headers: string[]): Partial<Record<keyof typeof HEADER_ALIASES, number>> {
  const normalised = headers.map(normaliseHeader);
  const map: Partial<Record<string, number>> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = normalised.findIndex((h) => aliases.includes(h));
    if (idx !== -1) map[field] = idx;
  }
  return map;
}
