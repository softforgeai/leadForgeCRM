import { describe, expect, it } from "vitest";
import { leadSchema, moneyToCents, publicFormSchema, tagsInput } from "./validation";

const STAGE = "6f1c1a52-6f39-4b8e-9d55-0b0c3f6f2a11";

describe("moneyToCents", () => {
  it.each([
    ["", 0],
    ["2500", 250000],
    ["2,500.50", 250050],
    ["$1,000", 100000],
  ])("parses %j", (input, cents) => {
    expect(moneyToCents.parse(input)).toBe(cents);
  });

  it.each(["abc", "-5", "1.234", "1e5"])("rejects %j", (input) => {
    expect(moneyToCents.safeParse(input).success).toBe(false);
  });

  it("rejects absurdly large values", () => {
    expect(moneyToCents.safeParse("99999999999").success).toBe(false);
  });
});

describe("tagsInput", () => {
  it("normalises, de-duplicates and caps tags", () => {
    expect(tagsInput.parse(" Hot, hot ,SEO,, ")).toEqual(["hot", "seo"]);
    expect(tagsInput.parse(Array.from({ length: 15 }, (_, i) => `t${i}`).join(","))).toHaveLength(10);
  });
});

describe("leadSchema", () => {
  it("accepts a minimal lead and nulls empty optional fields", () => {
    const parsed = leadSchema.parse({ name: " Ada ", stageId: STAGE, value: "", company: "", email: "" });
    expect(parsed).toMatchObject({ name: "Ada", company: null, email: null, value: 0, assignedTo: null, tags: [] });
  });

  it("requires a name and a valid stage", () => {
    const result = leadSchema.safeParse({ name: "", stageId: "nope", value: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid emails", () => {
    expect(leadSchema.safeParse({ name: "A", stageId: STAGE, value: "", email: "not-an-email" }).success).toBe(false);
  });
});

describe("publicFormSchema", () => {
  const base = { token: "a".repeat(32), name: "Jo", email: "jo@example.com" };

  it("accepts a valid submission", () => {
    expect(publicFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a filled honeypot", () => {
    expect(publicFormSchema.safeParse({ ...base, website: "http://spam" }).success).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(publicFormSchema.safeParse({ ...base, token: "../../etc" }).success).toBe(false);
  });

  it("caps message length", () => {
    expect(publicFormSchema.safeParse({ ...base, message: "x".repeat(2001) }).success).toBe(false);
  });
});
