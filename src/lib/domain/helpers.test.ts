import { describe, expect, it } from "vitest";
import {
  defaultListTitle,
  generateInviteCode,
  pickNextColor,
  validateItemName,
  validateQuantity,
} from "./helpers";
import { COLOR_POOL } from "./types";

describe("generateInviteCode", () => {
  it("returns 6-8 chars, alphanumeric lowercase", () => {
    for (let i = 0; i < 100; i++) {
      expect(generateInviteCode()).toMatch(/^[a-z0-9]{6,8}$/);
    }
  });

  it("is different across calls (statistically)", () => {
    const codes = new Set(Array.from({ length: 50 }, generateInviteCode));
    expect(codes.size).toBe(50);
  });
});

describe("pickNextColor", () => {
  it("picks first pool color when none taken", () => {
    expect(pickNextColor([])).toBe(COLOR_POOL[0]);
  });

  it("skips taken colors and picks next available", () => {
    expect(pickNextColor([COLOR_POOL[0]])).toBe(COLOR_POOL[1]);
    expect(pickNextColor(COLOR_POOL.slice(0, 3))).toBe(COLOR_POOL[3]);
  });

  it("wraps to pool[0] when all colors taken", () => {
    expect(pickNextColor([...COLOR_POOL])).toBe(COLOR_POOL[0]);
  });

  it("ignores unknown colors", () => {
    expect(pickNextColor(["#000000"])).toBe(COLOR_POOL[0]);
  });
});

describe("validateItemName", () => {
  it("rejects empty string", () => {
    expect(validateItemName("")).toBe(false);
  });

  it("rejects whitespace-only", () => {
    expect(validateItemName("   ")).toBe(false);
    expect(validateItemName("\t\n")).toBe(false);
  });

  it("rejects > 80 chars", () => {
    expect(validateItemName("a".repeat(81))).toBe(false);
  });

  it("accepts 1-80 char names", () => {
    expect(validateItemName("leite")).toBe(true);
    expect(validateItemName("a")).toBe(true);
    expect(validateItemName("a".repeat(80))).toBe(true);
  });

  it("trims before checking length bounds", () => {
    expect(validateItemName("  leite  ")).toBe(true);
  });
});

describe("validateQuantity", () => {
  it("accepts empty (optional field)", () => {
    expect(validateQuantity("")).toBe(true);
  });

  it("accepts up to 20 chars", () => {
    expect(validateQuantity("a".repeat(20))).toBe(true);
    expect(validateQuantity("2L")).toBe(true);
  });

  it("rejects > 20 chars", () => {
    expect(validateQuantity("a".repeat(21))).toBe(false);
  });
});

describe("defaultListTitle", () => {
  it("formats as 'Compras de YYYY-MM-DD' (UTC)", () => {
    const d = new Date("2026-04-19T10:00:00Z");
    expect(defaultListTitle(d)).toBe("Compras de 2026-04-19");
  });

  it("pads single-digit month and day", () => {
    const d = new Date("2026-01-05T00:00:00Z");
    expect(defaultListTitle(d)).toBe("Compras de 2026-01-05");
  });
});
