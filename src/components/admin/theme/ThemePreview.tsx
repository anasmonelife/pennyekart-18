import { useEffect, useRef } from "react";
import {
  UiThemeConfig,
  applyThemeVariables,
  clearThemeVariables,
} from "@/lib/uiThemes";
import { Search, Home, ShoppingBag, Heart, User, Star } from "lucide-react";

const MOCK_PRODUCTS = [
  { name: "Wooden Accent Chair", price: 2499, mrp: 3299, img: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=300&h=300&fit=crop" },
  { name: "Ceramic Planter Pot", price: 449, mrp: 599, img: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=300&h=300&fit=crop" },
  { name: "Table Lamp Brass", price: 1299, mrp: 1599, img: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&h=300&fit=crop" },
  { name: "Cushion Cover Set", price: 599, mrp: 749, img: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=300&h=300&fit=crop" },
];

const MOCK_CATEGORIES = ["Grocery", "Home", "Fashion", "Beauty", "Offers"];

const shadowClass = (shadow: UiThemeConfig["productCard"]["shadow"]) =>
  shadow === "none" ? "" : shadow === "strong" ? "shadow-lg" : "shadow-sm";

const imageRatioClass = (ratio: UiThemeConfig["productCard"]["imageRatio"]) =>
  ratio === "portrait" ? "aspect-[3/4]" : ratio === "landscape" ? "aspect-video" : "aspect-square";

const btnRadius = (config: UiThemeConfig) => `${config.buttons.radius}px`;
const cardRadius = (config: UiThemeConfig) => `${config.productCard.radius}px`;
const bannerRadius = (config: UiThemeConfig) => `${config.banner.radius}px`;

const headerBackground = (config: UiThemeConfig) => {
  if (config.header.style === "transparent") return "transparent";
  if (config.header.style === "gradient")
    return `linear-gradient(120deg, ${config.colors.headerBg}, ${config.colors.primary})`;
  return config.colors.headerBg;
};

const ThemeButton = ({ label, filled, config }: { label: string; filled?: boolean; config: UiThemeConfig }) => (
  <span
    className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold"
    style={{
      borderRadius: btnRadius(config),
      boxShadow: config.buttons.shadow && filled ? "0 1px 4px rgba(0,0,0,0.18)" : undefined,
      textTransform: config.buttons.uppercase ? "uppercase" : undefined,
      letterSpacing: config.buttons.uppercase ? "0.03em" : undefined,
      ...(config.buttons.style === "outline" && filled
        ? { background: "transparent", border: `1.5px solid ${config.colors.primary}`, color: config.colors.primary }
        : config.buttons.style === "soft" && filled
          ? { background: config.colors.accent, color: config.colors.primary }
          : { background: filled ? config.colors.primary : config.colors.muted, color: filled ? config.colors.primaryForeground : config.colors.mutedForeground }),
    }}
  >
    {label}
  </span>
);

/**
 * Static mock of the customer storefront styled entirely by the theme config —
 * used for live preview in the Theme Studio editor. No real data is fetched.
 */
const ThemePreview = ({ config }: { config: UiThemeConfig }) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    applyThemeVariables(el, config);
    return () => clearThemeVariables(el);
  }, [config]);

  return (
    <div ref={rootRef} className="overflow-hidden">
      <div
        className="flex w-full flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {/* Header */}
        <div
          className={config.header.sticky ? "sticky top-0 z-10" : ""}
          style={{
            background: headerBackground(config),
            color: config.header.style === "transparent" ? config.colors.foreground : config.colors.headerText,
            minHeight: Math.max(56, config.header.height / 2),
          }}
        >
          <div className="flex items-center justify-between px-4 py-2">
            {config.header.showLogo ? (
              config.header.logoUrl ? (
                <img src={config.header.logoUrl} alt="Logo" className="h-6 w-auto" />
              ) : (
                <span className="font-heading text-base font-bold" style={{ fontWeight: "var(--theme-heading-weight, 700)" as never }}>
                  Pennyekart
                </span>
              )
            ) : (
              <span />
            )}
            <span
              className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs"
              style={{ borderRadius: btnRadius(config) }}
            >
              <Search className="h-3 w-3" /> Search products…
            </span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto px-3 pb-2 scrollbar-hide">
            {MOCK_CATEGORIES.map((c, i) => (
              <span
                key={c}
                className="shrink-0 px-2.5 py-1 text-[11px] font-medium"
                style={{
                  borderRadius: config.categoryCard.style === "card" ? btnRadius(config) : "9999px",
                  background: i === 0 ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.12)",
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Banner */}
        <div className="px-3 pt-3">
          <div
            className="flex items-center justify-between px-4 py-4"
            style={{
              borderRadius: bannerRadius(config),
              background: `linear-gradient(120deg, ${config.colors.primary}, ${config.colors.accent})`,
              color: config.colors.primaryForeground,
              height: Math.max(72, config.banner.height / 2),
            }}
          >
            <div>
              <p className="font-heading text-sm font-bold" style={{ fontWeight: "var(--theme-heading-weight, 700)" as never }}>
                Big savings this week
              </p>
              <p className="text-[11px] opacity-80">Up to 40% off on daily picks</p>
            </div>
            <ThemeButton label="Shop now" filled config={config} />
          </div>
        </div>

        {/* Category circles */}
        <div className="mt-3 flex justify-between gap-2 px-3">
          {MOCK_CATEGORIES.slice(0, 4).map((c, i) => (
            <div key={c} className="flex flex-col items-center gap-1">
              <div
                className="h-12 w-12 bg-[hsl(var(--accent))]"
                style={{
                  borderRadius: config.categoryCard.style === "circle" ? "9999px" : config.categoryCard.style === "card" ? btnRadius(config) : "12px",
                  background: i === 0 ? config.colors.accent : config.colors.muted,
                }}
              />
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{c}</span>
            </div>
          ))}
        </div>

        {/* Product cards */}
        <div className="mt-4 px-3">
          <p className="mb-2 font-heading text-sm font-bold" style={{ fontWeight: "var(--theme-heading-weight, 700)" as never }}>
            Featured Products
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MOCK_PRODUCTS.map((p) => (
              <div
                key={p.name}
                className={`overflow-hidden bg-[hsl(var(--card))] ${shadowClass(config.productCard.shadow)}`}
                style={{ borderRadius: cardRadius(config), border: `1px solid hsl(var(--border))` }}
              >
                <div className={`relative ${imageRatioClass(config.productCard.imageRatio)} bg-[hsl(var(--muted))]`}>
                  <img src={p.img} alt={p.name} className="h-full w-full object-cover" />
                  {config.productCard.showDiscount && p.mrp > p.price && (
                    <span className="absolute left-1 top-1 rounded bg-[hsl(var(--destructive))] px-1 py-0.5 text-[9px] font-bold text-white">
                      {Math.round(((p.mrp - p.price) / p.mrp) * 100)}% OFF
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1 p-2">
                  <span className="line-clamp-2 text-[11px] font-medium">{p.name}</span>
                  {config.productCard.showRating && (
                    <div className="flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5 fill-[hsl(var(--primary))] text-[hsl(var(--primary))]" />
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">4.5</span>
                    </div>
                  )}
                  <div className="mt-auto flex items-baseline gap-1">
                    <span className="text-xs font-bold">₹{p.price}</span>
                    {p.mrp > p.price && <span className="text-[10px] text-[hsl(var(--muted-foreground))] line-through">₹{p.mrp}</span>}
                  </div>
                  <div className="mt-1 flex justify-end">
                    <ThemeButton label="Add" filled config={config} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom navigation */}
        <div
          className="mt-4 flex items-center justify-around px-2 py-2"
          style={{
            background: config.colors.navBg,
            borderTop: `1px solid hsl(var(--border))`,
            borderRadius: config.navigation.style === "floating" ? "16px 16px 0 0" : undefined,
            margin: config.navigation.style === "floating" ? "8px -6px 0" : undefined,
          }}
        >
          {[
            { icon: Home, label: "Home" },
            { icon: ShoppingBag, label: "Shop" },
            { icon: Heart, label: "Saved" },
            { icon: User, label: "Profile" },
          ].map((item, i) => (
            <div key={item.label} className="flex flex-col items-center gap-0.5">
              <item.icon
                className="h-4 w-4"
                style={{ color: i === 0 ? config.colors.navActive : "hsl(var(--muted-foreground))" }}
              />
              {config.navigation.style === "icons_labels" && (
                <span
                  className="text-[9px]"
                  style={{ color: i === 0 ? config.colors.navActive : "hsl(var(--muted-foreground))" }}
                >
                  {item.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThemePreview;
