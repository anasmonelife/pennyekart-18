import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, RotateCcw, LayoutGrid, Eye, Palette, Zap } from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";
import {
  ACCENT_PRESETS,
  DEFAULT_DISPLAY_SETTINGS,
  DisplaySettings,
  SECTION_LABELS,
  SETTINGS_KEY,
  fetchDisplaySettings,
  useDisplaySettings,
} from "@/hooks/useDisplaySettings";

const DisplaySettingsPanel = () => {
  const { toast } = useToast();
  const { refetch } = useDisplaySettings();
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDisplaySettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const persist = async (next: DisplaySettings) => {
    setSaving(true);
    try {
      const value = JSON.stringify(next);
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", SETTINGS_KEY)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("app_settings")
          .update({ value })
          .eq("key", SETTINGS_KEY);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("app_settings").insert({
          key: SETTINGS_KEY,
          value,
          description: "Customer app interface & display defaults",
        });
        if (error) throw error;
      }
      refetch();
      toast({ title: "Display settings saved" });
    } catch (err: any) {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const SaveBar = () => (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <Button onClick={() => persist(settings)} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save
      </Button>
      <Button
        variant="outline"
        disabled={saving}
        onClick={() => {
          setSettings(DEFAULT_DISPLAY_SETTINGS);
          persist(DEFAULT_DISPLAY_SETTINGS);
        }}
      >
        <RotateCcw className="mr-2 h-4 w-4" /> Reset to defaults
      </Button>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading interface settings...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Homepage sections */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Eye className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Homepage Sections</CardTitle>
              <CardDescription>
                Turn customer homepage blocks on or off. Sections with no content stay hidden automatically.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {SECTION_LABELS.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-4">
              <Label htmlFor={`sec-${s.key}`} className="font-normal">{s.label}</Label>
              <Switch
                id={`sec-${s.key}`}
                checked={settings.sections[s.key] !== false}
                onCheckedChange={(v) =>
                  update("sections", { ...settings.sections, [s.key]: v })
                }
              />
            </div>
          ))}
          <SaveBar />
        </CardContent>
      </Card>

      {/* Layout density */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <LayoutGrid className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Layout Density & Grid</CardTitle>
              <CardDescription>
                Control how many products show per row, how many rows appear on mobile, tablet and
                computer screens, and how tightly they are packed.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Products per row — mobile</Label>
              <Select
                value={String(settings.mobileColumns)}
                onValueChange={(v) => update("mobileColumns", Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 per row</SelectItem>
                  <SelectItem value="3">3 per row</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Products per row — desktop</Label>
              <Select
                value={String(settings.desktopColumns)}
                onValueChange={(v) => update("desktopColumns", Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} per row</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product rows — mobile</Label>
              <Select
                value={String(settings.mobileRows)}
                onValueChange={(v) => update("mobileRows", Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} row{n > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product rows — tablet</Label>
              <Select
                value={String(settings.tabletRows)}
                onValueChange={(v) => update("tabletRows", Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} row{n > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product rows — computer</Label>
              <Select
                value={String(settings.desktopRows)}
                onValueChange={(v) => update("desktopRows", Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} row{n > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Card size</Label>
              <Select
                value={settings.cardSize}
                onValueChange={(v) => update("cardSize", v as DisplaySettings["cardSize"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Spacing</Label>
              <Select
                value={settings.spacing}
                onValueChange={(v) => update("spacing", v as DisplaySettings["spacing"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SaveBar />
        </CardContent>
      </Card>

      {/* Theme & branding */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Palette className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Theme & Branding</CardTitle>
              <CardDescription>
                Default appearance for new visitors. Customers who pick their own theme keep their choice.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Default theme</Label>
              <Select
                value={settings.defaultTheme}
                onValueChange={(v) => update("defaultTheme", v as DisplaySettings["defaultTheme"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">Follow device</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Accent colour</Label>
              <Select value={settings.accent} onValueChange={(v) => update("accent", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCENT_PRESETS.map((p) => (
                    <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-label={p.label}
                onClick={() => update("accent", p.key)}
                className={`h-8 w-8 rounded-full border-2 transition ${
                  settings.accent === p.key ? "border-foreground" : "border-border"
                }`}
                style={{ backgroundColor: `hsl(${p.primary})` }}
              />
            ))}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="appName">App display name</Label>
            <Input
              id="appName"
              value={settings.appName}
              onChange={(e) => update("appName", e.target.value)}
              placeholder="Pennyekart"
            />
          </div>

          <ImageUpload
            bucket="banners"
            label="App logo"
            value={settings.logoUrl}
            onChange={(url) => update("logoUrl", url)}
          />

          <SaveBar />
        </CardContent>
      </Card>

      {/* Lite mode & performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Lite Mode & Performance</CardTitle>
              <CardDescription>Defaults for slower networks. Customers can still switch lite mode themselves.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="liteDefault" className="font-normal">Lite mode on by default</Label>
            <Switch
              id="liteDefault"
              checked={settings.defaultLiteMode}
              onCheckedChange={(v) => update("defaultLiteMode", v)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="reduceAnim" className="font-normal">Reduce animations</Label>
            <Switch
              id="reduceAnim"
              checked={settings.reduceAnimations}
              onCheckedChange={(v) => update("reduceAnimations", v)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="lazyLoad" className="font-normal">Lazy-load images</Label>
            <Switch
              id="lazyLoad"
              checked={settings.lazyLoadImages}
              onCheckedChange={(v) => update("lazyLoadImages", v)}
            />
          </div>
          <div className="space-y-2">
            <Label>Image quality</Label>
            <Select
              value={settings.imageQuality}
              onValueChange={(v) => update("imageQuality", v as DisplaySettings["imageQuality"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="saver">Data saver</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SaveBar />
        </CardContent>
      </Card>
    </div>
  );
};

export default DisplaySettingsPanel;