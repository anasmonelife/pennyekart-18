/**
 * Per-device row counts for homepage product strips.
 *
 * Rows = 1 keeps the classic single-row horizontal strip; rows > 1 show the
 * products stacked in multiple rows that still scroll horizontally.
 * Breakpoints: mobile (base), tablet (md: 768px+), computer (lg: 1024px+).
 * All class strings are literal so Tailwind's scanner picks them up.
 */

const ROW_BASE: Record<number, string> = {
  1: "grid-rows-1",
  2: "grid-rows-2",
  3: "grid-rows-3",
  4: "grid-rows-4",
};

const ROW_MD: Record<number, string> = {
  1: "md:grid-rows-1",
  2: "md:grid-rows-2",
  3: "md:grid-rows-3",
  4: "md:grid-rows-4",
};

const ROW_LG: Record<number, string> = {
  1: "lg:grid-rows-1",
  2: "lg:grid-rows-2",
  3: "lg:grid-rows-3",
  4: "lg:grid-rows-4",
};

export const clampRows = (n: unknown): number => {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v) || v < 1) return 1;
  return Math.min(v, 4);
};

/** Tailwind classes for the product strip container, per admin row settings. */
export const productRowClasses = (
  mobileRows: number,
  tabletRows: number,
  desktopRows: number
): string =>
  [
    ROW_BASE[clampRows(mobileRows)] ?? ROW_BASE[1],
    ROW_MD[clampRows(tabletRows)] ?? ROW_MD[1],
    ROW_LG[clampRows(desktopRows)] ?? ROW_LG[1],
  ].join(" ");
