import { Capacitor } from "@capacitor/core";
import { PushNotifications, type Token } from "@capacitor/push-notifications";

/**
 * Firebase (android/app/google-services.json) is present for all Pennyekart
 * Android packages, so registering is safe.
 */
export const PUSH_CONFIGURED = true;

/**
 * True only when running inside the native Android/iOS shell.
 * Everything native must be gated behind this so the web app is untouched.
 */
export const isNativeApp = () => Capacitor.isNativePlatform();

export const nativePlatform = (): "android" | "ios" | "web" =>
  Capacitor.getPlatform() as "android" | "ios" | "web";

const FCM_TOKEN_KEY = "pennyekart_fcm_token";
const PUSH_STATUS_KEY = "pennyekart_push_status";

export type PushStatus = {
  stage: string;
  at: string;
  tokenTail?: string; // last 8 chars only — never the full token
  error?: string;
};

/** Persists the latest push stage locally so it can be checked without Logcat. */
const setPushStatus = (stage: string, extra: Partial<PushStatus> = {}) => {
  const status: PushStatus = { stage, at: new Date().toISOString(), ...extra };
  try { localStorage.setItem(PUSH_STATUS_KEY, JSON.stringify(status)); } catch { /* ignore */ }
};

export const getPushStatus = (): PushStatus | null => {
  try {
    const raw = localStorage.getItem(PUSH_STATUS_KEY);
    return raw ? (JSON.parse(raw) as PushStatus) : null;
  } catch { return null; }
};

const tail = (t: string) => t.slice(-8);

/** Saves the FCM token to the signed-in user's profile. Never throws. */
const saveFcmToken = async (token: string, knownUserId?: string): Promise<boolean> => {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    let userId = knownUserId;
    if (!userId) {
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user.id;
    }
    if (!userId) {
      console.log("[Push] No signed-in user yet — token kept locally, will save after sign-in");
      setPushStatus("token_pending_signin", { tokenTail: tail(token) });
      return false;
    }
    // One token per profile: updating replaces any older token (no duplicates).
    const { data, error } = await supabase
      .from("profiles")
      .update({ fcm_token: token } as never)
      .eq("user_id", userId)
      .select("user_id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("No profile row updated for this user");
    console.log("[Push] FCM token saved to Supabase");
    setPushStatus("token_saved", { tokenTail: tail(token) });
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("[Push] Supabase token-save error:", msg);
    setPushStatus("token_save_failed", { tokenTail: tail(token), error: msg });
    return false;
  }
};

// ---------- Push wiring (listeners attached exactly once) ----------

let pushListenersReady: Promise<void> | null = null;
let registerRequested = false;
let tokenWaiters: Array<(t: string | null) => void> = [];

const resolveTokenWaiters = (t: string | null) => {
  const w = tokenWaiters;
  tokenWaiters = [];
  w.forEach((fn) => fn(t));
};

const setupPushListeners = (): Promise<void> => {
  if (pushListenersReady) return pushListenersReady;
  pushListenersReady = (async () => {
    console.log("[Push] Push plugin loaded, attaching listeners");

    await PushNotifications.addListener("registration", (token: Token) => {
      console.error("[Push] REGISTRATION EVENT RECEIVED:", JSON.stringify(token));
      console.error("[Push] FCM TOKEN:", token.value);
      setPushStatus("token_received", { tokenTail: tail(token.value) });
      try { localStorage.setItem(FCM_TOKEN_KEY, token.value); } catch { /* ignore */ }
      resolveTokenWaiters(token.value);
      void saveFcmToken(token.value);
    });

    await PushNotifications.addListener("registrationError", (error) => {
      const msg = JSON.stringify(error);
      console.error("[Push] Registration error:", msg);
      setPushStatus("registration_error", { error: msg });
      registerRequested = false; // allow a retry
      resolveTokenWaiters(null);
    });

    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("[Push] Notification received:", JSON.stringify(notification));
    });

    await PushNotifications.addListener("pushNotificationActionPerformed", async (action) => {
      // Running app: navigates via React Router now. Cold start: queued until the router mounts.
      const { pushTargetFromData, requestPushNavigation } = await import("@/lib/pushNavigation");
      const target = pushTargetFromData(action.notification.data as Record<string, unknown> | undefined);
      if (target) requestPushNavigation(target);
    });

    // Save a pending token once the user signs in (or on session restore).
    const { supabase } = await import("@/integrations/supabase/client");
    supabase.auth.onAuthStateChange((event, session) => {
      if (!session || (event !== "SIGNED_IN" && event !== "INITIAL_SESSION")) return;
      let pending: string | null = null;
      try { pending = localStorage.getItem(FCM_TOKEN_KEY); } catch { /* ignore */ }
      if (pending) setTimeout(() => void saveFcmToken(pending!, session.user.id), 0);
    });

    console.log("[Push] Listeners attached");
  })().catch((err) => {
    console.error("[Push] Listener setup failed:", err);
    setPushStatus("listener_setup_failed", { error: String(err) });
    pushListenersReady = null;
    throw err;
  });
  return pushListenersReady;
};

/** Calls register() once per app session, always after listeners exist. */
const registerForPush = async () => {
  await setupPushListeners();
  if (!PUSH_CONFIGURED || registerRequested) return;
  registerRequested = true;
  console.log("[Push] Registration requested");
  setPushStatus("registration_requested");
  try {
    await PushNotifications.register();
  } catch (err) {
    registerRequested = false;
    console.error("[Push] register() failed:", err);
    setPushStatus("registration_error", { error: String(err) });
    throw err;
  }
};

/**
 * One-time native bootstrap. Safe to call on the web — it no-ops there.
 * Push: registers only if already granted; never prompts at launch.
 */
export const initNativeApp = async () => {
  if (!isNativeApp()) return;
  console.log("[Push] Native initialization started");

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#1a120b" });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch { /* status bar plugin unavailable */ }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    setTimeout(() => SplashScreen.hide().catch(() => {}), 800);
  } catch { /* ignore */ }

  try {
    const { App } = await import("@capacitor/app");
    await App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else App.minimizeApp();
    });
    // Permission may be changed in phone settings while the app is backgrounded.
    await App.addListener("resume", () => {
      PushNotifications.checkPermissions()
        .then((p) => { if (p.receive === "granted") void registerForPush().catch(() => {}); })
        .catch(() => {});
    });
    // WhatsApp-shared links (community invites, verification) open the app via
    // an Android intent; route the web view to the linked screen.
    await App.addListener("appUrlOpen", ({ url }) => {
      try {
        const target = new URL(url);
        if (target.origin === window.location.origin) {
          window.history.pushState({}, "", target.pathname + target.search);
          window.dispatchEvent(new PopStateEvent("popstate"));
        } else {
          window.location.href = url;
        }
      } catch { /* ignore malformed link */ }
    });
  } catch { /* ignore */ }

  try {
    await setupPushListeners();
    const perm = await PushNotifications.checkPermissions();
    console.log("[Push] Permission status:", perm.receive);
    setPushStatus(`permission_${perm.receive}`);
    if (perm.receive === "granted") await registerForPush();
  } catch (err) {
    console.error("[Push] Startup push init failed:", err);
  }
};

/**
 * Explains, then asks for notification permission, registers and waits for the
 * FCM token. Returns true only once a token has been received.
 */
export const enableNotifications = async (): Promise<boolean> => {
  const { explainPermission } = await import("@/lib/permissionPrompt");
  if (!(await explainPermission("notifications"))) return false;
  if (isNativeApp()) {
    try {
      await setupPushListeners();
      const perm = await PushNotifications.requestPermissions();
      console.log("[Push] Permission status after request:", perm.receive);
      setPushStatus(`permission_${perm.receive}`);
      if (perm.receive !== "granted") return false;

      const waitForToken = new Promise<string | null>((resolve) => {
        tokenWaiters.push(resolve);
        setTimeout(() => resolve(null), 15000);
      });
      // Already registered this session? Re-register to get the token event again.
      registerRequested = false;
      await registerForPush();
      const token = await waitForToken;
      if (!token) {
        console.error("[Push] No FCM token received within 15s");
        return false;
      }
      await saveFcmToken(token);
      return true;
    } catch (err) {
      console.error("[Push] enableNotifications failed:", err);
      return false;
    }
  }
  if (typeof Notification === "undefined") return false;
  return (await Notification.requestPermission()) === "granted";
};
