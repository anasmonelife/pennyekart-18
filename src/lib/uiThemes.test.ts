import { describe, expect, it } from "vitest";
import {
  DEFAULT_UI_THEME_CONFIG,
  THEME_SECTION_LABELS,
  THEME_TEMPLATES,
  hexToHslTriplet,
  mergeThemeConfig,
  themeCssVariables,
} from "./uiThemes";

describe("uiThemes", () => {
  it("merges a partial stored config over defaults without losing fields", () => {
    const merged = mergeThemeConfig({ colors: { primary: "#15803d" }, fonts: { heading: "Merriweather" } });
    expect(merged.colors.primary).toBe("#15803d");
    expect(merged.colors.background).toBe(DEFAULT_UI_THEME_CONFIG.colors.background);
    expect(merged.fonts.heading).toBe("Merriweather");
    expect(merged.fonts.body).toBe(DEFAULT_UI_THEME_CONFIG.fonts.body);
    expect(merged.productCard.showRating).toBe(true);
    expect(merged.homepage.sections.length).toBe(THEME_SECTION_LABELS.length);
  });

  it("falls back to defaults for invalid or empty configs", () => {
    expect(mergeThemeConfig(null)).toEqual(DEFAULT_UI_THEME_CONFIG);
    expect(mergeThemeConfig("nope")).toEqual(DEFAULT_UI_THEME_CONFIG);
  });

  it("keeps every known section and appends unknown-order leftovers", () => {
    const reordered = mergeThemeConfig({
      homepage: { sections: ["flash_sale", "category_bar", "banner_carousel"] },
    });
    expect(reordered.homepage.sections.slice(0, 3)).toEqual(["flash_sale", "category_bar", "banner_carousel"]);
    // every section still present exactly once
    expect(new Set(reordered.homepage.sections).size).toBe(THEME_SECTION_LABELS.length);
    expect(reordered.homepage.sections.length).toBe(THEME_SECTION_LABELS.length);
  });

  it("converts hex colors to HSL triplets for the Tailwind tokens", () => {
    expect(hexToHslTriplet("#d97706")).toBe("36 92% 44%");
    expect(hexToHslTriplet("#ffffff")).toBe("0 0% 100%");
    expect(hexToHslTriplet("#000000")).toBe("0 0% 0%");
    expect(hexToHslTriplet("not-a-color")).toBe("0 0% 50%");
  });

  it("emits one CSS variable per token plus theme-specific extras", () => {
    const vars = themeCssVariables(DEFAULT_UI_THEME_CONFIG);
    const names = vars.map(([n]) => n);
    for (const name of ["--primary", "--background", "--radius", "--font-heading", "--theme-header-bg", "--theme-card-radius"]) {
      expect(names).toContain(name);
    }
    const primary = vars.find(([n]) => n === "--primary")![1];
    expect(primary).not.toContain("#");
    const radius = vars.find(([n]) => n === "--radius")![1];
    expect(radius).toBe(`${DEFAULT_UI_THEME_CONFIG.buttons.radius / 16}rem`);
  });

  it("ships five ready-made templates with complete configs", () => {
    expect(THEME_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    for (const t of THEME_TEMPLATES) {
      expect(t.config.colors.primary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.config.homepage.sections.length).toBe(THEME_SECTION_LABELS.length);
      expect(t.config.fonts.heading.length).toBeGreaterThan(0);
    }
    const keys = THEME_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
