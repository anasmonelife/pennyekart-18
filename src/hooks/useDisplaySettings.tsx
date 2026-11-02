import { createContext, useContext, useEffect, useMemo, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SETTINGS_KEY = "ui_display_settings";

export type SectionKey =
  | "carbs_strip"
  | "cart_reminder"
  | "flash_sale"
  | "category_bar"
  | "sort_bar"
  | "banner_carousel"
  | "scratch_widget"
  | "grocery_categories"
  | "combo_offers";

export const SECTION_LABELS: { key: SectionKey; label: string }[] = [
  { key: "carbs_strip", label: "Penny Carbs food strip" },
  { key: "cart_reminder", label: "Cart reminder banner" },
  { key: "flash_sale", label: "Flash sale banner" },
  { key: "category_bar", label: "Category bar" },
  { key: "sort_bar", label: "Sort & filter bar" },
  { key: "banner_carousel", label: "Banner carousel" },
  { key: "scratch_widget", label: "Scratch & win widget" },
  { key: "grocery_categories", label: "Grocery categories" },
  { key: "combo_offers", label: "Combo offers" },
];

export const ACCENT_PRESETS: { key: string; label: string; primary: string; ring: string }[] = [
  { key: "amber", label: "Amber (default)", primary: "37 68% 47%", ring: "37 68% 47%" },
  { key: "forest", label: "Forest Green", primary: "150 40% 30%", ring: "150 40% 30%" },
  { key: "terracotta", label: "Terracotta", primary: "14 62% 48%", ring: "14 62% 48%" },
  { key: "indigo", label: "Deep Indigo", primary: "232 45% 42%", ring: "232 45% 42%" },
];

export interface DisplaySettings {
  sections: Record<SectionKey, boolean>;
  mobileColumns: number;
  desktopColumns: number;
  mobileRows: number;
  tabletRows: number;
  desktopRows: number;
  cardSize: "compact" | "standard" | "large";
  spacing: "compact" | "comfortable";
  defaultTheme: "light" | "dark" | "system";
  accent: string;
  appName: string;
  logoUrl: string;
  defaultLiteMode: boolean;
  reduceAnimations: boolean;
  imageQuality: "high" | "balanced" | "saver";
  lazyLoadImages: boolean;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  sections: SECTION_LABELS.reduce(
    (acc, s) => ({ ...acc, [s.key]: true }),
    {} as Record<SectionKey, boolean>
  ),
  mobileColumns: 2,
  desktopColumns: 5,
  cardSize: "standard",
  spacing: "comfortable",
  defaultTheme: "light",
  accent: "amber",
  appName: "Pennyekart",
  logoUrl: "",
  defaultLiteMode: false,
  reduceAnimations: false,
  imageQuality: "high",
  lazyLoadImages: true,
};

export const mergeSettings = (raw: unknown): DisplaySettings => {
  if (!raw || typeof raw !== "object") return DEFAULT_DISPLAY_SETTINGS;
  const partial = raw as Partial<DisplaySettings>;
  return {
    ...DEFAULT_DISPLAY_SETTINGS,
    ...partial,
    sections: { ...DEFAULT_DISPLAY_SETTINGS.sections, ...(partial.sections ?? {}) },
  };
};

interface DisplaySettingsContextValue {
  settings: DisplaySettings;
  loading: boolean;
  isSectionVisible: (key: SectionKey) => boolean;
  refetch: () => void;
}

const DisplaySettingsContext = createContext<DisplaySettingsContextValue>({
  settings: DEFAULT_DISPLAY_SETTINGS,
  loading: false,
  isSectionVisible: () => true,
  refetch: () => {},
});

export const fetchDisplaySettings = async (): Promise<DisplaySettings> => {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  if (!data?.value) return DEFAULT_DISPLAY_SETTINGS;
  try {
    return mergeSettings(JSON.parse(data.value));
  } catch {
    return DEFAULT_DISPLAY_SETTINGS;
  }
};

export const DisplaySettingsProvider = ({ children }: { children: ReactNode }) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ui-display-settings"],
    queryFn: fetchDisplaySettings,
    staleTime: 5 * 60 * 1000,
  });

  const settings = data ?? DEFAULT_DISPLAY_SETTINGS;

  // Apply accent tokens + theme + animation preferences to the document
  useEffect(() => {
    const root = document.documentElement;
    const preset = ACCENT_PRESETS.find((p) => p.key === settings.accent);
    if (preset) {
      root.style.setProperty("--primary", preset.primary);
      root.style.setProperty("--ring", preset.ring);
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
    }

    root.classList.toggle("reduce-animations", settings.reduceAnimations);

    // Theme: local user choice always wins
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("pennyekart_theme");
    } catch {}
    const effective =
      stored ??
      (settings.defaultTheme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : settings.defaultTheme);
    root.classList.toggle("dark", effective === "dark");
  }, [settings.accent, settings.reduceAnimations, settings.defaultTheme]);

  const value = useMemo<DisplaySettingsContextValue>(
    () => ({
      settings,
      loading: isLoading,
      isSectionVisible: (key) => settings.sections[key] !== false,
      refetch: () => {
        void refetch();
      },
    }),
    [settings, isLoading, refetch]
  );

  return (
    <DisplaySettingsContext.Provider value={value}>{children}</DisplaySettingsContext.Provider>
  );
};

export const useDisplaySettings = () => useContext(DisplaySettingsContext);

/** Tailwind classes derived from the admin layout density settings. */
export const useGridClasses = () => {
  const { settings } = useDisplaySettings();
  const cardWidth =
    settings.cardSize === "compact"
      ? "w-28 md:w-36"
      : settings.cardSize === "large"
        ? "w-44 md:w-56"
        : "w-36 md:w-44";
  const gap = settings.spacing === "compact" ? "gap-1.5" : "gap-3";
  const sectionPadding = settings.spacing === "compact" ? "py-2" : "py-4";
  const mobileCols = settings.mobileColumns === 3 ? "grid-cols-3" : "grid-cols-2";
  const desktopColsMap: Record<number, string> = {
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
    5: "md:grid-cols-5",
    6: "md:grid-cols-6",
  };
  const desktopCols = desktopColsMap[settings.desktopColumns] ?? "md:grid-cols-5";
  const imgLoading: "lazy" | "eager" = settings.lazyLoadImages ? "lazy" : "eager";
  return { cardWidth, gap, sectionPadding, mobileCols, desktopCols, imgLoading };
};