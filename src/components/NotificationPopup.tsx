import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { resolveInternalLink } from "@/lib/appLinks";
import { Bell, ExternalLink } from "lucide-react";

const SHOWN_KEY = "notif_popup_shown_v1";

const NotificationPopup = () => {
  const { firstUnread, markRead, markClicked } = useNotifications();
  const [open, setOpen] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [activeNotification, setActiveNotification] = useState<AppNotification | null>(null);
  const navigate = useNavigate();

  // Snapshot a new unread notification into local state so the popup
  // doesn't disappear when markRead() updates the underlying list.
  useEffect(() => {
    if (!firstUnread) return;
    if (open || activeNotification) return;
    const shown = JSON.parse(sessionStorage.getItem(SHOWN_KEY) || "[]") as string[];
    if (shown.includes(firstUnread.id)) return;
    setActiveNotification(firstUnread);
    setOpen(true);
    setShowFull(false);
    sessionStorage.setItem(SHOWN_KEY, JSON.stringify([...shown, firstUnread.id]));
  }, [firstUnread, open, activeNotification]);

  // Auto-dismiss after configured seconds (0 = disabled)
  // Only starts AFTER the user opens the full message.
  useEffect(() => {
    if (!open || !showFull || !activeNotification) return;
    const seconds = activeNotification.auto_dismiss_seconds ?? 0;
    if (!seconds || seconds <= 0) return;
    const t = setTimeout(() => setOpen(false), seconds * 1000);
    return () => clearTimeout(t);
  }, [open, showFull, activeNotification]);

  // Clear local snapshot once dialog has fully closed
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setShowFull(false);
      // Defer clearing so closing animation doesn't flicker content
      setTimeout(() => setActiveNotification(null), 200);
    }
  };

  if (!activeNotification) return null;

  const handleView = () => {
    setShowFull(true);
    markRead(activeNotification.id);
  };

  const handleLinkClick = () => {
    if (!activeNotification.link_url) return;
    markClicked(activeNotification.id);
    // Internal Pennyekart links open inside the app; external ones open a tab.
    const route = resolveInternalLink(activeNotification.link_url);
    if (route) {
      navigate(route);
      handleOpenChange(false);
    } else {
      window.open(activeNotification.link_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        {!showFull ? (
          <>
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
                <Bell className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-xl mb-2" lang="ml">
                നിങ്ങൾക്ക് ഒരു മെസ്സേജ് വന്നിട്ടുണ്ട്
              </DialogTitle>
              <DialogDescription>You have a new message</DialogDescription>
              <div className="flex gap-2 mt-6 w-full">
                <Button variant="outline" className="flex-1" onClick={() => handleOpenChange(false)}>
                  Later
                </Button>
                <Button className="flex-1" onClick={handleView}>
                  View Message
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{activeNotification.title}</DialogTitle>
            </DialogHeader>
            {activeNotification.image_url && (
              <img
                src={activeNotification.image_url}
                alt={activeNotification.title}
                className="w-full max-h-64 object-contain rounded-md border"
              />
            )}
            <p className="text-sm text-foreground whitespace-pre-wrap">{activeNotification.message}</p>
            <div className="flex gap-2">
              {activeNotification.link_url && (
                <Button className="flex-1" onClick={handleLinkClick}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {activeNotification.link_label || "Open Link"}
                </Button>
              )}
              <Button variant="outline" className="flex-1" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NotificationPopup;
