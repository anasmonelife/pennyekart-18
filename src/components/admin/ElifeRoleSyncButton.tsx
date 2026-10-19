import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";

const ElifeRoleSyncButton = ({ onDone }: { onDone: () => void }) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!window.confirm("Match users with e-Life by mobile number and set the role with the same name? Super admins are not changed.")) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("elife-role-sync", { body: {} });
    setBusy(false);
    if (error || data?.error) {
      return toast({ title: "Sync failed", description: data?.error || error?.message, variant: "destructive" });
    }
    const missing = (data.unmatched_roles ?? []) as string[];
    toast({
      title: `${data.updated} roles updated`,
      description: `${data.matched} users matched on e-Life.${missing.length ? ` No matching role here for: ${missing.join(", ")}.` : ""}`,
    });
    onDone();
  };

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={busy}>
      {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
      <span className="hidden sm:inline">Sync e-Life </span>roles
    </Button>
  );
};

export default ElifeRoleSyncButton;
