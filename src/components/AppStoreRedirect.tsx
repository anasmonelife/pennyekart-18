import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PLAY_STORE_URL } from "@/lib/appLinks";
import logo from "@/assets/logo.png";

const SECONDS = 5;

/**
 * Mobile-browser screen for WhatsApp-shared links: counts down and opens the
 * Play Store listing (the web page cannot know whether the app is installed).
 * "Continue in browser" unmounts this screen, cancelling the redirect.
 */
const AppStoreRedirect = ({ onContinue }: { onContinue: () => void }) => {
  const [left, setLeft] = useState(SECONDS);

  useEffect(() => {
    const redirect = setTimeout(() => window.location.assign(PLAY_STORE_URL), SECONDS * 1000);
    const tick = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => {
      clearTimeout(redirect);
      clearInterval(tick);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-primary/20">
        <CardContent className="p-8 text-center space-y-4">
          <img src={logo} alt="Pennyekart" className="mx-auto h-14" />
          <div className="space-y-1">
            <p className="font-semibold text-lg">Open the Pennyekart app</p>
            <p className="text-sm text-muted-foreground">
              Taking you to Google Play in {left}s to get the app…
            </p>
          </div>
          <Button className="w-full" asChild>
            <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer">Get the app on Google Play</a>
          </Button>
          <Button variant="outline" className="w-full" onClick={onContinue}>
            Continue in browser
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppStoreRedirect;
