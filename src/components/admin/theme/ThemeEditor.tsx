import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Loader2, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  THEME_FONT_OPTIONS,
  THEME_SECTION_LABELS,
  ThemeColors,
  ThemeSectionKey,
  UiThemeConfig,
  reorderSections,
} from "@/lib/uiThemes";

const COLOR_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "primaryForeground", label: "On primary" },
  { key: "background", label: "Background" },
  { key: "foreground", label: "Text" },
  { key: "card", label: "Card background" },
  { key: "cardForeground", label: "Card text" },
  { key: "accent", label: "Accent" },
  { key: "muted", label: "Muted surface" },
  { key: "mutedForeground", label: "Muted text" },
  { key: "border", label: "Borders" },
  { key: "ring", label: "Focus ring" },
  { key: "destructive", label: "Destructive" },
  { key: "headerBg", label: "Header background" },
  { key: "headerText", label: "Header text" },
  { key: "navBg", label: "Bottom nav background" },
  { key: "navActive", label: "Bottom nav active" },
];

export interface ThemeEditorProps {
  name: string;
  description: string;
  config: UiThemeConfig;
  saving: boolean;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onConfigChange: (c: UiThemeConfig) => void;
  onSave: () => void;
  onReset: () => void;
}

const selectClasses = "h-9 rounded-md border border-input bg-transparent px-3 text-sm";

/**
 * All Theme Studio editing controls — colors, fonts, buttons, header, navigation,
 * product/category cards, banners, and drag-and-drop homepage section ordering.
 * Purely presentational: it never fetches or persists anything itself.
 */
const ThemeEditor = ({
  name,
  description,
  config,
  saving,
  onNameChange,
  onDescriptionChange,
  onConfigChange,
  onSave,
  onReset,
}: ThemeEditorProps) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const updateColors = (patch: Partial<ThemeColors>) =>
    onConfigChange({ ...config, colors: { ...config.colors, ...patch } });

  const moveSection = (from: number, to: number) => {
    const sections = reorderSections(config.homepage.sections, from, to);
    if (sections !== config.homepage.sections) {
      onConfigChange({ ...config, homepage: { sections } });
    }
  };

  return (
    <div className="space-y-4">
      {/* Name & description */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="theme-edit-name">Theme name</Label>
          <Input id="theme-edit-name" value={name} onChange={(e) => onNameChange(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="theme-edit-desc">Description</Label>
          <Input id="theme-edit-desc" value={description} onChange={(e) => onDescriptionChange(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onReset} disabled={saving}>
          <RotateCcw className="mr-1 h-4 w-4" /> Reset to defaults
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save changes
        </Button>
      </div>

      {/* Colors */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">Colors</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {COLOR_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <input
                type="color"
                aria-label={`${label} color`}
                value={config.colors[key]}
                onChange={(e) => updateColors({ [key]: e.target.value } as Partial<ThemeColors>)}
                className="h-8 w-10 cursor-pointer rounded border"
              />
              <div className="min-w-0 text-xs">
                <p className="font-medium">{label}</p>
                <p className="text-muted-foreground">{config.colors[key]}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fonts */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">Fonts</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="theme-heading-font">Heading font</Label>
            <select
              id="theme-heading-font"
              className={`${selectClasses} w-full`}
              value={config.fonts.heading}
              onChange={(e) => onConfigChange({ ...config, fonts: { ...config.fonts, heading: e.target.value } })}
            >
              {THEME_FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="theme-body-font">Body font</Label>
            <select
              id="theme-body-font"
              className={`${selectClasses} w-full`}
              value={config.fonts.body}
              onChange={(e) => onConfigChange({ ...config, fonts: { ...config.fonts, body: e.target.value } })}
            >
              {THEME_FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="theme-heading-weight">Heading weight</Label>
            <select
              id="theme-heading-weight"
              className={`${selectClasses} w-full`}
              value={config.fonts.headingWeight}
              onChange={(e) => onConfigChange({ ...config, fonts: { ...config.fonts, headingWeight: e.target.value as UiThemeConfig["fonts"]["headingWeight"] } })}
            >
              <option value="bold">Bold</option>
              <option value="semibold">Semibold</option>
              <option value="extrabold">Extrabold</option>
            </select>
          </div>
        </div>
      </section>

      {/* Buttons */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">Buttons</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Corner radius · {config.buttons.radius}px</Label>
            <Slider
              value={[config.buttons.radius]}
              min={0} max={28} step={1}
              onValueChange={([v]) => onConfigChange({ ...config, buttons: { ...config.buttons, radius: v } })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="theme-btn-style">Style</Label>
            <select
              id="theme-btn-style"
              className={`${selectClasses} w-full`}
              value={config.buttons.style}
              onChange={(e) => onConfigChange({ ...config, buttons: { ...config.buttons, style: e.target.value as UiThemeConfig["buttons"]["style"] } })}
            >
              <option value="filled">Filled</option>
              <option value="outline">Outline</option>
              <option value="soft">Soft</option>
            </select>
          </div>
          <label className="flex items-center justify-between gap-2 text-sm">
            Button shadow
            <Switch checked={config.buttons.shadow} onCheckedChange={(v) => onConfigChange({ ...config, buttons: { ...config.buttons, shadow: v } })} />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm">
            Uppercase labels
            <Switch checked={config.buttons.uppercase} onCheckedChange={(v) => onConfigChange({ ...config, buttons: { ...config.buttons, uppercase: v } })} />
          </label>
        </div>
      </section>

      {/* Header */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">Header</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="theme-header-style">Style</Label>
            <select
              id="theme-header-style"
              className={`${selectClasses} w-full`}
              value={config.header.style}
              onChange={(e) => onConfigChange({ ...config, header: { ...config.header, style: e.target.value as UiThemeConfig["header"]["style"] } })}
            >
              <option value="solid">Solid</option>
              <option value="gradient">Gradient</option>
              <option value="transparent">Transparent</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Height · {config.header.height}px</Label>
            <Slider
              value={[config.header.height]}
              min={56} max={220} step={2}
              onValueChange={([v]) => onConfigChange({ ...config, header: { ...config.header, height: v } })}
            />
          </div>
          <label className="flex items-center justify-between gap-2 text-sm">
            Sticky header
            <Switch checked={config.header.sticky} onCheckedChange={(v) => onConfigChange({ ...config, header: { ...config.header, sticky: v } })} />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm">
            Show logo
            <Switch checked={config.header.showLogo} onCheckedChange={(v) => onConfigChange({ ...config, header: { ...config.header, showLogo: v } })} />
          </label>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="theme-logo-url">Logo image URL (optional)</Label>
            <Input
              id="theme-logo-url"
              placeholder="https://…"
              value={config.header.logoUrl}
              onChange={(e) => onConfigChange({ ...config, header: { ...config.header, logoUrl: e.target.value } })}
            />
          </div>
        </div>
      </section>

      {/* Navigation */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">Bottom navigation</h3>
        <div className="space-y-1 sm:max-w-xs">
          <Label htmlFor="theme-nav-style">Style</Label>
          <select
            id="theme-nav-style"
            className={`${selectClasses} w-full`}
            value={config.navigation.style}
            onChange={(e) => onConfigChange({ ...config, navigation: { style: e.target.value as UiThemeConfig["navigation"]["style"] } })}
          >
            <option value="icons_labels">Icons with labels</option>
            <option value="icons_only">Icons only</option>
            <option value="floating">Floating</option>
          </select>
        </div>
      </section>

      {/* Product cards */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">Product cards</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Corner radius · {config.productCard.radius}px</Label>
            <Slider
              value={[config.productCard.radius]}
              min={0} max={28} step={1}
              onValueChange={([v]) => onConfigChange({ ...config, productCard: { ...config.productCard, radius: v } })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="theme-card-shadow">Card shadow</Label>
            <select
              id="theme-card-shadow"
              className={`${selectClasses} w-full`}
              value={config.productCard.shadow}
              onChange={(e) => onConfigChange({ ...config, productCard: { ...config.productCard, shadow: e.target.value as UiThemeConfig["productCard"]["shadow"] } })}
            >
              <option value="none">None</option>
              <option value="soft">Soft</option>
              <option value="strong">Strong</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="theme-card-ratio">Image shape</Label>
            <select
              id="theme-card-ratio"
              className={`${selectClasses} w-full`}
              value={config.productCard.imageRatio}
              onChange={(e) => onConfigChange({ ...config, productCard: { ...config.productCard, imageRatio: e.target.value as UiThemeConfig["productCard"]["imageRatio"] } })}
            >
              <option value="square">Square</option>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
          <div className="space-y-2 text-sm">
            <label className="flex items-center justify-between gap-2">
              Show rating
              <Switch checked={config.productCard.showRating} onCheckedChange={(v) => onConfigChange({ ...config, productCard: { ...config.productCard, showRating: v } })} />
            </label>
            <label className="flex items-center justify-between gap-2">
              Show discount badge
              <Switch checked={config.productCard.showDiscount} onCheckedChange={(v) => onConfigChange({ ...config, productCard: { ...config.productCard, showDiscount: v } })} />
            </label>
            <label className="flex items-center justify-between gap-2">
              Show wallet points
              <Switch checked={config.productCard.showWalletPoints} onCheckedChange={(v) => onConfigChange({ ...config, productCard: { ...config.productCard, showWalletPoints: v } })} />
            </label>
          </div>
        </div>
      </section>

      {/* Category cards & banners */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold">Category cards</h3>
          <div className="space-y-1 sm:max-w-xs">
            <Label htmlFor="theme-cat-style">Shape</Label>
            <select
              id="theme-cat-style"
              className={`${selectClasses} w-full`}
              value={config.categoryCard.style}
              onChange={(e) => onConfigChange({ ...config, categoryCard: { style: e.target.value as UiThemeConfig["categoryCard"]["style"] } })}
            >
              <option value="circle">Circle</option>
              <option value="rounded">Rounded</option>
              <option value="card">Card</option>
            </select>
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold">Banners</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Radius · {config.banner.radius}px</Label>
              <Slider
                value={[config.banner.radius]}
                min={0} max={32} step={1}
                onValueChange={([v]) => onConfigChange({ ...config, banner: { ...config.banner, radius: v } })}
              />
            </div>
            <div className="space-y-2">
              <Label>Height · {config.banner.height}px</Label>
              <Slider
                value={[config.banner.height]}
                min={100} max={260} step={5}
                onValueChange={([v]) => onConfigChange({ ...config, banner: { ...config.banner, height: v } })}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Homepage section order — drag to reorder, arrows as fallback */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-1 text-sm font-semibold">Homepage section order</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Drag a section to move it up or down the customer homepage. The product rows always stay last.
        </p>
        <ol className="space-y-1">
          {config.homepage.sections.map((key: ThemeSectionKey, i: number) => {
            const label = THEME_SECTION_LABELS.find((s) => s.key === key)?.label ?? key;
            return (
              <li
                key={key}
                draggable
                aria-label={`Section: ${label}`}
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null && dragIndex !== i) moveSection(dragIndex, i);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={`flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm ${dragIndex === i ? "opacity-50" : ""}`}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="w-5 text-right text-xs text-muted-foreground">{i + 1}</span>
                <span className="flex-1 truncate font-medium">{label}</span>
                <Button
                  type="button" size="sm" variant="ghost"
                  aria-label={`Move ${label} up`} disabled={i === 0}
                  onClick={() => moveSection(i, i - 1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button" size="sm" variant="ghost"
                  aria-label={`Move ${label} down`} disabled={i === config.homepage.sections.length - 1}
                  onClick={() => moveSection(i, i + 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
};

export default ThemeEditor;
