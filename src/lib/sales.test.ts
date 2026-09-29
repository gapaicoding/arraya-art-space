import { describe, expect, it } from "vitest";
import { sumSalesTotal } from "./sales";

describe("sumSalesTotal", () => {
  it("sums the total column across transactions", () => {
    expect(sumSalesTotal([{ total: 29000 }, { total: 54000 }])).toBe(83000);
  });

  it("returns 0 for an empty list", () => {
    expect(sumSalesTotal([])).toBe(0);
  });
});
