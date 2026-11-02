// Shared model for customer UI themes (admin Theme Studio + customer application).
// Presentation only — themes never change shopping behaviour.

export type ThemeSectionKey =
  | "carbs_strip"
  | "cart_reminder"
  | "flash_sale"
  | "category_bar"
  | "sort_bar"
  | "banner_carousel"
  | "scratch_widget"
  | "grocery_categories"
  | "combo_offers";

export const THEME_SECTION_LABELS: { key: ThemeSectionKey; label: string }[] = [
  { key: "cart_reminder", label: "Cart reminder banner" },
  { key: "carbs_strip", label: "Penny Carbs food strip" },
  { key: "flash_sale", label: "Flash sale banner" },
  { key: "category_bar", label: "Category bar" },
  { key: "banner_carousel", label: "Banner carousel" },
  { key: "grocery_categories", label: "Grocery categories" },
  { key: "scratch_widget", label: "Scratch & win widget" },
  { key: "combo_offers", label: "Combo offers" },
  { key: "sort_bar", label: "Sort & filter bar" },
];

export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  accent: string;
  muted: string;
  mutedForeground: string;
  border: string;
  ring: string;
  destructive: string;
  headerBg: string;
  headerText: string;
  navBg: string;
  navActive: string;
}

export interface ThemeFonts {
  heading: string;
  body: string;
  headingWeight: "bold" | "semibold" | "extrabold";
}

export interface ThemeButtons {
  radius: number;
  style: "filled" | "outline" | "soft";
  shadow: boolean;
  uppercase: boolean;
}

export interface ThemeHeader {
  style: "solid" | "gradient" | "transparent";
  height: number;
  sticky: boolean;
  showLogo: boolean;
  logoUrl: string;
}

export interface ThemeNavigation {
  style: "icons_labels" | "icons_only" | "floating";
}

export interface ThemeProductCard {
  radius: number;
  shadow: "none" | "soft" | "strong";
  imageRatio: "square" | "portrait" | "landscape";
  showRating: boolean;
  showDiscount: boolean;
  showWalletPoints: boolean;
}

export interface ThemeCategoryCard {
  style: "circle" | "rounded" | "card";
}

export interface ThemeBanner {
  radius: number;
  height: number;
}

export interface UiThemeConfig {
  colors: ThemeColors;
  fonts: ThemeFonts;
  buttons: ThemeButtons;
  header: ThemeHeader;
  navigation: ThemeNavigation;
  homepage: { sections: ThemeSectionKey[] };
  productCard: ThemeProductCard;
  categoryCard: ThemeCategoryCard;
  banner: ThemeBanner;
}

export const DEFAULT_THEME_COLORS: ThemeColors = {
  primary: "#d97706",
  primaryForeground: "#faf7f0",
  background: "#fffdf7",
  foreground: "#221a0f",
  card: "#ffffff",
  cardForeground: "#221a0f",
  accent: "#fef3c7",
  muted: "#f5f0e6",
  mutedForeground: "#78716c",
  border: "#e7e0d1",
  ring: "#d97706",
  destructive: "#dc2626",
  headerBg: "#d97706",
  headerText: "#faf7f0",
  navBg: "#ffffff",
  navActive: "#d97706",
};

export const DEFAULT_UI_THEME_CONFIG: UiThemeConfig = {
  colors: DEFAULT_THEME_COLORS,
  fonts: { heading: "Playfair Display", body: "DM Sans", headingWeight: "bold" },
  buttons: { radius: 12, style: "filled", shadow: true, uppercase: false },
  header: { style: "solid", height: 112, sticky: true, showLogo: true, logoUrl: "" },
  navigation: { style: "icons_labels" },
  homepage: { sections: THEME_SECTION_LABELS.map((s) => s.key) },
  productCard: {
    radius: 12,
    shadow: "soft",
    imageRatio: "square",
    showRating: true,
    showDiscount: true,
    showWalletPoints: true,
  },
  categoryCard: { style: "circle" },
  banner: { radius: 16, height: 160 },
};

/** Deep-merge a stored/partial theme config over the defaults. */
export const mergeThemeConfig = (raw: unknown): UiThemeConfig => {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_UI_THEME_CONFIG };
  const partial = raw as Partial<UiThemeConfig>;
  return {
    ...DEFAULT_UI_THEME_CONFIG,
    ...partial,
    colors: { ...DEFAULT_THEME_COLORS, ...(partial.colors ?? {}) },
    fonts: { ...DEFAULT_UI_THEME_CONFIG.fonts, ...(partial.fonts ?? {}) },
    buttons: { ...DEFAULT_UI_THEME_CONFIG.buttons, ...(partial.buttons ?? {}) },
    header: { ...DEFAULT_UI_THEME_CONFIG.header, ...(partial.header ?? {}) },
    navigation: { ...DEFAULT_UI_THEME_CONFIG.navigation, ...(partial.navigation ?? {}) },
    homepage: {
      sections: mergeSectionOrder(partial.homepage?.sections),
    },
    productCard: { ...DEFAULT_UI_THEME_CONFIG.productCard, ...(partial.productCard ?? {}) },
    categoryCard: { ...DEFAULT_UI_THEME_CONFIG.categoryCard, ...(partial.categoryCard ?? {}) },
    banner: { ...DEFAULT_UI_THEME_CONFIG.banner, ...(partial.banner ?? {}) },
  };
};

const mergeSectionOrder = (raw: unknown): ThemeSectionKey[] => {
  const valid = new Set(THEME_SECTION_LABELS.map((s) => s.key));
  const cleaned = Array.isArray(raw) ? (raw as unknown[]).filter((k): k is ThemeSectionKey => typeof k === "string" && valid.has(k as ThemeSectionKey)) : [];
  const missing = THEME_SECTION_LABELS.map((s) => s.key).filter((k) => !cleaned.includes(k));
  return [...cleaned, ...missing];
};

// ---------- Ready-made templates ----------

const template = (
  key: string,
  label: string,
  description: string,
  overrides: Partial<UiThemeConfig>
): UiThemeTemplate => {
  const base = mergeThemeConfig({});
  const merged = mergeThemeConfig({ ...base, ...overrides });
  return { key, label, description, config: merged };
};

export interface UiThemeTemplate {
  key: string;
  label: string;
  description: string;
  config: UiThemeConfig;
}

export const THEME_TEMPLATES: UiThemeTemplate[] = [
  template("classic_amber", "Classic Amber", "The current Pennyekart look — warm amber on cream.", {}),
  template("forest_fresh", "Forest Fresh", "Calm green accents for a fresh grocery feel.", {
    colors: {
      ...DEFAULT_THEME_COLORS,
      primary: "#15803d",
      primaryForeground: "#f0fdf4",
      background: "#fbfdf9",
      foreground: "#12241a",
      accent: "#dcfce7",
      muted: "#eef5ee",
      mutedForeground: "#5f6f63",
      border: "#dbe7d9",
      ring: "#15803d",
      headerBg: "#15803d",
      navActive: "#15803d",
    },
  }),
  template("terracotta_warm", "Terracotta Warm", "Earthy terracotta with soft clay tones.", {
    colors: {
      ...DEFAULT_THEME_COLORS,
      primary: "#c2410c",
      primaryForeground: "#fff7ed",
      background: "#fdf8f3",
      foreground: "#2b1a10",
      accent: "#ffedd5",
      muted: "#f6ecdf",
      mutedForeground: "#7c6a58",
      border: "#eaddca",
      ring: "#c2410c",
      headerBg: "#c2410c",
      navActive: "#c2410c",
    },
    fonts: { heading: "Merriweather", body: "Nunito Sans", headingWeight: "bold" },
    productCard: { radius: 16, shadow: "soft", imageRatio: "square", showRating: true, showDiscount: true, showWalletPoints: true },
  }),
  template("midnight_indigo", "Midnight Indigo", "Dark shopping mode with indigo highlights.", {
    colors: {
      ...DEFAULT_THEME_COLORS,
      primary: "#818cf8",
      primaryForeground: "#0f1130",
      background: "#0f1130",
      foreground: "#e2e5ff",
      card: "#181b45",
      cardForeground: "#e2e5ff",
      accent: "#232759",
      muted: "#1d2150",
      mutedForeground: "#9aa1d6",
      border: "#2b3067",
      ring: "#818cf8",
      headerBg: "#0f1130",
      headerText: "#e2e5ff",
      navBg: "#181b45",
      navActive: "#818cf8",
    },
    fonts: { heading: "Montserrat", body: "Work Sans", headingWeight: "semibold" },
    productCard: { radius: 14, shadow: "soft", imageRatio: "square", showRating: true, showDiscount: true, showWalletPoints: true },
  }),
  template("warm_marketplace", "Warm Marketplace", "Boutique marketplace style — walnut on warm cream.", {
    colors: {
      ...DEFAULT_THEME_COLORS,
      primary: "#7c4a21",
      primaryForeground: "#fdf6ee",
      background: "#faf3ea",
      foreground: "#33221a",
      card: "#ffffff",
      cardForeground: "#33221a",
      accent: "#f3e4d3",
      muted: "#f1e7d9",
      mutedForeground: "#8a7461",
      border: "#e4d4c0",
      ring: "#7c4a21",
      headerBg: "#7c4a21",
      navActive: "#7c4a21",
    },
    fonts: { heading: "Playfair Display", body: "Work Sans", headingWeight: "bold" },
    buttons: { radius: 10, style: "filled", shadow: true, uppercase: false },
    productCard: { radius: 14, shadow: "strong", imageRatio: "portrait", showRating: true, showDiscount: true, showWalletPoints: false },
    categoryCard: { style: "rounded" },
    banner: { radius: 20, height: 190 },
  }),
];

// ---------- Row type (matches the ui_themes table) ----------

export interface UiThemeRow {
  id: string;
  name: string;
  description: string | null;
  template_key: string;
  config: unknown;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  publish_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- CSS variable application ----------

/** Convert #rrggbb to the "H S% L%" triplet format the Tailwind tokens use. */
export const hexToHslTriplet = (hex: string): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "0 0% 50%";
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = Math.round(((h * 60) + 360) % 360);
  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const COLOR_VAR_MAP: { css: string; pick: (c: ThemeColors) => string }[] = [
  { css: "--primary", pick: (c) => c.primary },
  { css: "--primary-foreground", pick: (c) => c.primaryForeground },
  { css: "--background", pick: (c) => c.background },
  { css: "--foreground", pick: (c) => c.foreground },
  { css: "--card", pick: (c) => c.card },
  { css: "--card-foreground", pick: (c) => c.cardForeground },
  { css: "--accent", pick: (c) => c.accent },
  { css: "--muted", pick: (c) => c.muted },
  { css: "--muted-foreground", pick: (c) => c.mutedForeground },
  { css: "--border", pick: (c) => c.border },
  { css: "--ring", pick: (c) => c.ring },
  { css: "--destructive", pick: (c) => c.destructive },
];

const HEADER_NAV_VARS: { css: string; pick: (c: ThemeColors) => string }[] = [
  { css: "--theme-header-bg", pick: (c) => c.headerBg },
  { css: "--theme-header-text", pick: (c) => c.headerText },
  { css: "--theme-nav-bg", pick: (c) => c.navBg },
  { css: "--theme-nav-active", pick: (c) => c.navActive },
];

/** All CSS custom properties a theme sets, as [name, value] pairs. */
export const themeCssVariables = (config: UiThemeConfig): [string, string][] => {
  const vars: [string, string][] = COLOR_VAR_MAP.map(({ css, pick }) => [css, hexToHslTriplet(pick(config.colors))]);
  vars.push(...HEADER_NAV_VARS.map(({ css, pick }) => [css, pick(config.colors)]));
  vars.push(["--radius", `${config.buttons.radius / 16}rem`]);
  vars.push(["--theme-card-radius", `${config.productCard.radius}px`]);
  vars.push(["--theme-banner-radius", `${config.banner.radius}px`]);
  vars.push(["--theme-btn-radius", `${config.buttons.radius}px`]);
  vars.push(["--font-heading", `'${config.fonts.heading}', serif`]);
  vars.push(["--font-body", `'${config.fonts.body}', sans-serif`]);
  vars.push(["--theme-heading-weight", config.fonts.headingWeight === "semibold" ? "600" : config.fonts.headingWeight === "extrabold" ? "800" : "700"]);
  return vars;
};

/** Apply a theme to an element (documentElement for the live site, preview root in the editor). */
export const applyThemeVariables = (el: HTMLElement, config: UiThemeConfig): void => {
  for (const [name, value] of themeCssVariables(config)) {
    el.style.setProperty(name, value);
  }
};

/** Remove every variable a theme could have set (used when switching back to defaults). */
export const clearThemeVariables = (el: HTMLElement): void => {
  const names = new Set<string>([...themeCssVariables(DEFAULT_UI_THEME_CONFIG).map(([n]) => n)]);
  for (const name of names) el.style.removeProperty(name);
};

/** Curated font families available to themes (loaded in index.html). */
export const THEME_FONT_OPTIONS = [
  "Playfair Display",
  "DM Sans",
  "Merriweather",
  "Nunito Sans",
  "Montserrat",
  "Work Sans",
];
