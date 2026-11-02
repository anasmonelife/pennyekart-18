import { createContext, useContext, useMemo, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_UI_THEME_CONFIG,
  UiThemeConfig,
  UiThemeRow,
  applyThemeVariables,
  clearThemeVariables,
  mergeThemeConfig,
} from "@/lib/uiThemes";

export interface UiThemeState {
  themeId: string | null;
  themeName: string;
  config: UiThemeConfig;
}

const UiThemeContext = createContext<UiThemeState>({
  themeId: null,
  themeName: "Default",
  config: DEFAULT_UI_THEME_CONFIG,
});

/** Fetch the single published theme (readable by everyone, including logged-out customers). */
export const fetchPublishedUiTheme = async (): Promise<UiThemeState> => {
  const { data } = await supabase
    .from("ui_themes")
    .select("id, name, config")
    .eq("status", "published")
    .limit(1)
    .maybeSingle();
  if (!data) return { themeId: null, themeName: "Default", config: DEFAULT_UI_THEME_CONFIG };
  const row = data as Pick<UiThemeRow, "id" | "name" | "config">;
  return {
    themeId: row.id,
    themeName: row.name,
    config: mergeThemeConfig(row.config),
  };
};

/**
 * Applies the published customer theme to the live site. Presentation only:
 * it swaps colors, fonts and radii through CSS variables and never touches
 * shopping, cart, checkout or order behaviour.
 */
export const UiThemeProvider = ({ children }: { children: ReactNode }) => {
  const { data } = useQuery({
    queryKey: ["ui-published-theme"],
    queryFn: fetchPublishedUiTheme,
    staleTime: 5 * 60 * 1000,
  });

  const state = data ?? { themeId: null, themeName: "Default", config: DEFAULT_UI_THEME_CONFIG };

  useEffect(() => {
    const root = document.documentElement;
    if (state.themeId) {
      applyThemeVariables(root, state.config);
    } else {
      clearThemeVariables(root);
    }
    return () => clearThemeVariables(root);
  }, [state.themeId, state.config]);

  const value = useMemo(() => state, [state.themeId, state.themeName, state.config]);

  return <UiThemeContext.Provider value={value}>{children}</UiThemeContext.Provider>;
};

export const useUiTheme = () => useContext(UiThemeContext);
