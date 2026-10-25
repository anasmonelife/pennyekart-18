import LegalLinks from "@/components/LegalLinks";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLiteMode } from "@/hooks/useLiteMode";
import { Zap } from "lucide-react";
import logo from "@/assets/logo.png";


const CustomerLogin = () => {
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLiteSuggestion, setShowLiteSuggestion] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { setLiteMode } = useLiteMode();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(mobile)) {
      toast({ title: "Enter a valid 10-digit mobile number", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Safety timeout - if login takes more than 15 seconds, reset
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      setShowLiteSuggestion(true);
      toast({ title: "Login timed out", description: "Please try again or switch to Lite version.", variant: "destructive" });
    }, 15000);

    try {
      const { data, error } = await supabase.functions.invoke("customer-auth", { body: { action: "login", mobile } });
      clearTimeout(timeoutRef.current);

      if (data?.status === "not_registered") {
        setLoading(false);
        toast({ title: "Not registered", description: "Redirecting to sign up..." });
        setTimeout(() => navigate("/customer/signup", { state: { mobile } }), 800);
        return;
      }
      if (error || data?.status !== "ok") {
        setLoading(false);
        let msg = data?.error;
        try { msg = msg || (await (error as any)?.context?.json())?.error; } catch { /* ignore */ }
        toast({ title: "Login failed", description: msg || "Please try again.", variant: "destructive" });
        return;
      }
      await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
      setLoading(false);
      const next = searchParams.get("next");
      navigate(next && next.startsWith("/") ? next : "/");
    } catch (err) {
      clearTimeout(timeoutRef.current);
      setShowLiteSuggestion(true);
      toast({ title: "Connection error", description: "Please check your internet connection and try again.", variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logo} alt="Pennyekart" className="mx-auto mb-4 h-12" />
          <CardTitle className="text-2xl">Customer Login</CardTitle>
          <CardDescription>Enter your mobile number to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input id="mobile" type="tel" placeholder="10-digit number" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              New customer? <Link to="/customer/signup" className="text-primary underline">Sign up here</Link>
            </p>
            {showLiteSuggestion && (
              <div className="rounded-lg border border-accent bg-accent/10 p-3 text-center">
                <p className="text-sm font-medium text-foreground mb-2">
                  Having trouble? Try our Lite version
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Faster loading, works better on older phones
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setLiteMode(true);
                    navigate("/");
                  }}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Switch to Lite Version
                </Button>
              </div>
            )}
            <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-2">
              <Link to="/selling-partner/login" className="text-primary underline">Selling Partner Login</Link>
              <span>·</span>
              <Link to="/delivery-staff/login" className="text-primary underline">Delivery Partner Login</Link>
            </div>
            <LegalLinks className="pt-2" />
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerLogin;
