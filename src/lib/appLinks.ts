/**
 * App-link helpers for links shared through WhatsApp (community invites and
 * account verification). Web browsers cannot detect whether the Android app
 * is installed, so mobile browsers get a countdown redirect to the Play Store
 * listing with a "continue in browser" escape hatch; the native shell and
 * desktop proceed straight to the link's flow.
 */
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.pennyekart.app&pcampaignid=web_share";

export type LinkDevice = "app" | "mobile_browser" | "desktop";

export const resolveLinkDevice = (isNative: boolean, userAgent: string): LinkDevice => {
  if (isNative) return "app";
  return /android|iphone|ipad|ipod|iemobile|opera mini|blackberry|mobile/i.test(userAgent)
    ? "mobile_browser"
    : "desktop";
};

export const communityInviteLink = (origin: string, inviteId: string): string =>
  `${origin.replace(/\/+$/, "")}/community/invite/${inviteId}`;

export const communityInviteWhatsAppMessage = (communityName: string, link: string): string =>
  `You're invited to join the "${communityName}" community on Pennyekart!\n\nTap to accept:\n${link}`;

/** Opens the WhatsApp app/site with a pre-filled share message. */
export const whatsappShareUrl = (message: string): string =>
  `https://wa.me/?text=${encodeURIComponent(message)}`;
