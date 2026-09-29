import { describe, expect, it } from "vitest";
import { isValidIndonesianPhone } from "./phone";

describe("isValidIndonesianPhone", () => {
  it("accepts numbers starting with 08", () => {
    expect(isValidIndonesianPhone("081234567890")).toBe(true);
  });

  it("accepts numbers starting with +62", () => {
    expect(isValidIndonesianPhone("+6281234567890")).toBe(true);
  });

  it("accepts numbers starting with 62", () => {
    expect(isValidIndonesianPhone("6281234567890")).toBe(true);
  });

  it("accepts numbers with spaces or dashes", () => {
    expect(isValidIndonesianPhone("0812-3456-7890")).toBe(true);
    expect(isValidIndonesianPhone("0812 3456 7890")).toBe(true);
  });

  it("rejects numbers not starting with 8 after the prefix", () => {
    expect(isValidIndonesianPhone("0212345678")).toBe(false);
  });

  it("rejects too-short numbers", () => {
    expect(isValidIndonesianPhone("0812345")).toBe(false);
  });

  it("rejects non-Indonesian formats", () => {
    expect(isValidIndonesianPhone("+14155552671")).toBe(false);
  });

  it("rejects empty or non-numeric input", () => {
    expect(isValidIndonesianPhone("")).toBe(false);
    expect(isValidIndonesianPhone("abcdefghij")).toBe(false);
  });
});
