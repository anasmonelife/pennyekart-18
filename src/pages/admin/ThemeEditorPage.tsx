import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import ThemeEditor from "@/components/admin/theme/ThemeEditor";
import ThemePreview from "@/components/admin/theme/ThemePreview";
import { Button } from "@/components/ui/button";
import { DEFAULT_UI_THEME_CONFIG, UiThemeConfig, UiThemeRow, mergeThemeConfig } from "@/lib/uiThemes";

const db = supabase as unknown as { from: (t: string) => any };

export default function ThemeEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState<UiThemeConfig>(() => mergeThemeConfig({}));

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await db.from("ui_themes").select("*").eq("id", id).maybeSingle();
    if (error) {
      toast.error(error.message);
    } else if (!data) {
      setNotFound(true);
    } else {
      const row = data as UiThemeRow;
      setName(row.name);
      setDescription(row.description ?? "");
      setConfig(mergeThemeConfig(row.config));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await db.from("ui_themes").update({ name, description, config }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Theme saved");
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/themes")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Theme Studio
          </Button>
          {name && <h1 className="text-lg font-semibold">Editing “{name}”</h1>}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : notFound ? (
          <p className="py-12 text-center text-muted-foreground">This theme no longer exists.</p>
        ) : (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <ThemeEditor
              name={name}
              description={description}
              config={config}
              saving={saving}
              onNameChange={setName}
              onDescriptionChange={setDescription}
              onConfigChange={setConfig}
              onSave={() => void save()}
              onReset={() => setConfig(mergeThemeConfig(DEFAULT_UI_THEME_CONFIG))}
            />
            <div className="xl:sticky xl:top-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Live preview (mobile storefront)</p>
              <div className="overflow-hidden rounded-xl border bg-muted/30">
                <ThemePreview config={config} />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
