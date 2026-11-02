import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Palette, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { THEME_TEMPLATES, UiThemeRow } from "@/lib/uiThemes";

const db = supabase as unknown as {
  from: (t: string) => any;
  rpc: (fn: string, a?: Record<string, unknown>) => any;
};

const STATUS_LABEL: Record<string, string> = { draft: "Draft", published: "Published", archived: "Archived" };
const moneyDate = (v: string | null) => (v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

export default function ThemeStudioPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<UiThemeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [templateKey, setTemplateKey] = useState<string>(THEME_TEMPLATES[0]?.key ?? "classic_amber");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await db.from("ui_themes").select("*").order("updated_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data ?? []) as UiThemeRow[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const published = rows.find(r => r.status === "published") ?? null;
  const archived = rows.filter(r => r.status === "archived");

  const publish = async (row: UiThemeRow) => {
    if (published && published.id !== row.id &&
      !window.confirm(`“${published.name}” is currently live. Publish “${row.name}” instead and archive it?`)) return;
    setBusy(true);
    const { error } = await db.rpc("publish_ui_theme", { _theme_id: row.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`“${row.name}” is now live on the customer app`);
    void load();
  };

  const rollback = async () => {
    if (archived.length === 0) return;
    const previous = archived[0];
    if (!window.confirm(`Restore “${previous.name}” (last published ${moneyDate(previous.published_at)}) and archive the current theme?`)) return;
    setBusy(true);
    const { data, error } = await db.rpc("rollback_ui_theme");
    setBusy(false);
    if (error) return toast.error(error.message);
    if (!data) return toast.error("No earlier theme to roll back to");
    toast.success(`Rolled back to “${previous.name}”`);
    void load();
  };

  const duplicate = async (row: UiThemeRow) => {
    setBusy(true);
    const { data, error } = await db.from("ui_themes").insert({
      name: `${row.name} (copy)`,
      description: row.description,
      template_key: row.template_key,
      config: row.config,
      status: "draft",
    }).select("id").single();
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? "Could not duplicate the theme");
    toast.success("Copy created as a draft");
    navigate(`/admin/themes/${(data as { id: string }).id}`);
  };

  const remove = async (row: UiThemeRow) => {
    if (row.status === "published") {
      toast.error("Publish another theme first, then delete this one");
      return;
    }
    if (!window.confirm(`Delete “${row.name}”? This cannot be undone.`)) return;
    setBusy(true);
    const { error } = await db.from("ui_themes").delete().eq("id", row.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Theme deleted");
    void load();
  };

  const createFromTemplate = async () => {
    const name = newName.trim() || "New theme";
    const tmpl = THEME_TEMPLATES.find(t => t.key === templateKey) ?? THEME_TEMPLATES[0];
    setBusy(true);
    const { data, error } = await db.from("ui_themes").insert({
      name,
      description: tmpl?.description ?? null,
      template_key: tmpl?.key ?? "custom",
      config: tmpl?.config ?? {},
      status: "draft",
    }).select("id").single();
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? "Could not create the theme");
    toast.success("Draft created — start editing");
    navigate(`/admin/themes/${(data as { id: string }).id}`);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold"><Palette className="h-6 w-6" /> Theme Studio</h1>
            <p className="text-sm text-muted-foreground">
              Design the customer storefront: colors, fonts, cards, and homepage section order. Presentation only — shopping behaviour never changes.
            </p>
          </div>
          <div className="flex gap-2">
            {archived.length > 0 && (
              <Button variant="outline" onClick={() => void rollback()} disabled={busy}>
                <RotateCcw className="mr-1 h-4 w-4" /> Roll back
              </Button>
            )}
            <Button onClick={() => { setNewName(""); setNewOpen(true); }} disabled={busy}>
              <Plus className="mr-1 h-4 w-4" /> New theme
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : error ? (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No themes yet. Create one from a ready-made template.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map(row => {
              const tmpl = THEME_TEMPLATES.find(t => t.key === row.template_key);
              return (
                <Card key={row.id} className={row.status === "published" ? "border-primary" : undefined}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{row.name}</CardTitle>
                      <Badge variant={row.status === "published" ? "default" : "secondary"}>{STATUS_LABEL[row.status] ?? row.status}</Badge>
                    </div>
                    <CardDescription className="line-clamp-2">{tmpl?.label ? `${tmpl.label} · ` : ""}{row.description ?? ""}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-muted-foreground">
                    <p>
                      {row.status === "published" ? "Live since" : "Updated"} {moneyDate(row.status === "published" ? row.published_at : row.updated_at)}
                      {" · "}published {row.publish_count}×
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/admin/themes/${row.id}`)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      {row.status !== "published" && (
                        <Button size="sm" onClick={() => void publish(row)} disabled={busy}>
                          {row.status === "archived" ? "Re-publish" : "Publish"}
                        </Button>
                      )}
                      {row.status === "published" && <span className="self-center text-xs font-medium text-primary">Live on the app</span>}
                      <Button size="sm" variant="outline" onClick={() => void duplicate(row)} disabled={busy}>Duplicate</Button>
                      <Button
                        size="sm" variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => void remove(row)} disabled={busy || row.status === "published"}
                        title={row.status === "published" ? "Publish another theme first, then delete this one" : undefined}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={newOpen} onOpenChange={o => { if (!o && !busy) setNewOpen(false); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New theme</DialogTitle>
              <DialogDescription>Start from a ready-made template — every detail stays editable in the editor.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="theme-name">Theme name</Label>
                <Input id="theme-name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="New theme" disabled={busy} />
              </div>
              <fieldset className="space-y-2" disabled={busy}>
                <legend className="text-sm font-medium">Template</legend>
                <div className="grid gap-2">
                  {THEME_TEMPLATES.map(t => (
                    <label key={t.key} className="flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm has-[:checked]:border-primary">
                      <input
                        type="radio" name="theme-template" className="mt-1"
                        checked={templateKey === t.key} onChange={() => setTemplateKey(t.key)}
                      />
                      <span>
                        <span className="font-medium">{t.label}</span>
                        <span className="block text-xs text-muted-foreground">{t.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex justify-end gap-2">
                <Button variant="outline" disabled={busy} onClick={() => setNewOpen(false)}>Cancel</Button>
                <Button onClick={() => void createFromTemplate()} disabled={busy}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Create draft</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
