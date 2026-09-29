import { describe, expect, it } from "vitest";
import { sumExpenseTotal } from "./expenses";

describe("sumExpenseTotal", () => {
  it("sums the total column across transactions", () => {
    expect(sumExpenseTotal([{ total: 250000 }, { total: 45000 }])).toBe(295000);
  });

  it("returns 0 for an empty list", () => {
    expect(sumExpenseTotal([])).toBe(0);
  });
});
