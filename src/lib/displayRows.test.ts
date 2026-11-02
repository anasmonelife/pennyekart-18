import { describe, it, expect } from "vitest";
import { clampRows, productRowClasses } from "./displayRows";

describe("productRowClasses", () => {
  it("uses 2 rows by default per device", () => {
    expect(productRowClasses(2, 2, 2)).toBe("grid-rows-2 md:grid-rows-2 lg:grid-rows-2");
  });

  it("keeps the single-row strip when every device is set to 1 row", () => {
    expect(productRowClasses(1, 1, 1)).toBe("grid-rows-1 md:grid-rows-1 lg:grid-rows-1");
  });

  it("applies different row counts per device", () => {
    expect(productRowClasses(2, 3, 4)).toBe("grid-rows-2 md:grid-rows-3 lg:grid-rows-4");
  });

  it("falls back to 1 row for missing or out-of-range values", () => {
    expect(productRowClasses(NaN, 0, -2)).toBe("grid-rows-1 md:grid-rows-1 lg:grid-rows-1");
    expect(productRowClasses(9, 9, 9)).toBe("grid-rows-4 md:grid-rows-4 lg:grid-rows-4");
  });

  it("clamps rows into the 1-4 range", () => {
    expect(clampRows(0)).toBe(1);
    expect(clampRows(2.6)).toBe(3);
    expect(clampRows(10)).toBe(4);
  });
});
