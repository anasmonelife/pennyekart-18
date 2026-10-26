import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PLAY_STORE_URL, androidAppIntentUrl } from "@/lib/appLinks";
import logo from "@/assets/logo.png";

const SECONDS = 5;

/**
 * Mobile-browser screen for WhatsApp-shared links. On Android it opens the
 * installed app directly at the linked screen (the link travels inside an
 * intent); when the app is missing, Chrome falls back to the Play Store
 * listing. Other devices redirect to the Play Store listing as before.
 * "Continue in browser" unmounts this screen, cancelling the redirect.
 */
const AppStoreRedirect = ({ onContinue }: { onContinue: () => void }) => {
  const [left, setLeft] = useState(SECONDS);
  const currentLink = window.location.href;
  const opensApp = /android/i.test(navigator.userAgent) && Boolean(currentLink);

  useEffect(() => {
    const target = opensApp ? androidAppIntentUrl(currentLink) : PLAY_STORE_URL;
    const redirect = setTimeout(() => window.location.assign(target), SECONDS * 1000);
    const tick = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => {
      clearTimeout(redirect);
      clearInterval(tick);
    };
    // The link is captured on mount; the redirect decision must not change mid-countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-primary/20">
        <CardContent className="p-8 text-center space-y-4">
          <img src={logo} alt="Pennyekart" className="mx-auto h-14" />
          <div className="space-y-1">
            <p className="font-semibold text-lg">Open the Pennyekart app</p>
            <p className="text-sm text-muted-foreground">
              {opensApp
                ? `Opening the app in ${left}s…`
                : `Taking you to Google Play in ${left}s to get the app…`}
            </p>
          </div>
          {opensApp && (
            <Button className="w-full" asChild>
              <a href={androidAppIntentUrl(currentLink)}>Open the app</a>
            </Button>
          )}
          <Button variant={opensApp ? "outline" : "default"} className="w-full" asChild>
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
