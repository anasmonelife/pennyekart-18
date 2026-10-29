import { isNativeApp } from "@/lib/native";

const LAST_ASK_KEY = "pennyekart_push_last_asked_at";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Ask at most once per session even if several callers fire together. */
let askedThisSession = false;

const permissionGranted = async (): Promise<boolean> => {
  try {
    if (isNativeApp()) {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const perm = await PushNotifications.checkPermissions();
      return perm.receive === "granted";
    }
    if (typeof Notification === "undefined") return false;
    return Notification.permission === "granted";
  } catch {
    return false;
  }
};

/**
 * Asks the signed-in customer to turn on notifications, at most once every
 * 7 days. Skips silently when permission is already granted or the ask
 * happened this week. The timestamp is saved before the ask so a dismissed
 * dialog also counts toward the weekly wait.
 */
export const maybeAskForNotifications = async (): Promise<void> => {
  if (askedThisSession) return;
  askedThisSession = true;
  try {
    if (await permissionGranted()) return;
    let last = 0;
    try { last = Number(localStorage.getItem(LAST_ASK_KEY) || 0); } catch { /* ignore */ }
    if (Number.isFinite(last) && last > 0 && Date.now() - last < WEEK_MS) return;
    try { localStorage.setItem(LAST_ASK_KEY, String(Date.now())); } catch { /* ignore */ }
    const { enableNotifications } = await import("@/lib/native");
    await enableNotifications();
  } catch {
    // Never block sign-in on a notification ask.
  }
};
