import { describe, expect, it } from "vitest";
import {
  androidAppIntentUrl,
  communityInviteLink,
  communityInviteWhatsAppMessage,
  resetDeepLinkDedupe,
  resolveInternalLink,
  resolveLinkDevice,
  shouldOpenDeepLink,
  whatsappShareUrl,
} from "./appLinks";

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

describe("resolveLinkDevice", () => {
  it("routes the native shell straight to the app", () => {
    expect(resolveLinkDevice(true, DESKTOP_UA)).toBe("app");
    expect(resolveLinkDevice(true, ANDROID_UA)).toBe("app");
  });

  it("sends Android and iPhone browsers to the Play Store redirect", () => {
    expect(resolveLinkDevice(false, ANDROID_UA)).toBe("mobile_browser");
    expect(resolveLinkDevice(false, IPHONE_UA)).toBe("mobile_browser");
  });

  it("lets desktop browsers open the link directly", () => {
    expect(resolveLinkDevice(false, DESKTOP_UA)).toBe("desktop");
    expect(resolveLinkDevice(false, "")).toBe("desktop");
  });
});

describe("invite share message", () => {
  it("builds the invite link from the site origin", () => {
    expect(communityInviteLink("https://www.pennyekart.com/", "abc-123")).toBe(
      "https://www.pennyekart.com/community/invite/abc-123",
    );
  });

  it("puts the community name and link in the WhatsApp message", () => {
    const msg = communityInviteWhatsAppMessage("Green Valley", "https://x.test/i/1");
    expect(msg).toContain('"Green Valley"');
    expect(msg).toContain("https://x.test/i/1");
  });
});

describe("whatsapp share url", () => {
  it("encodes the message for wa.me", () => {
    const msg = communityInviteWhatsAppMessage("Green Valley", "https://x.test/i/1");
    expect(whatsappShareUrl(msg)).toBe(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  });
});

describe("android app intent url", () => {
  it("targets the app package with the link path and scheme", () => {
    const intent = androidAppIntentUrl("https://www.pennyekart.com/community/invite/abc-123");
    expect(intent).toContain("intent://www.pennyekart.com/community/invite/abc-123#Intent;");
    expect(intent).toContain("scheme=https");
    expect(intent).toContain(`package=com.pennyekart.app`);
    expect(intent.endsWith(";end")).toBe(true);
  });

  it("falls back to the same link when the app is not installed", () => {
    const link = "https://www.pennyekart.com/customer/verify?token=a/b";
    expect(androidAppIntentUrl(link)).toContain(
      `S.browser_fallback_url=${encodeURIComponent(link)}`,
    );
  });

  it("keeps the query string in the intent path", () => {
    expect(androidAppIntentUrl("https://x.test/community/invite/i1?next=2")).toContain(
      "intent://x.test/community/invite/i1?next=2#Intent;",
    );
  });
});

describe("resolveInternalLink", () => {
  it("accepts bare internal paths", () => {
    expect(resolveInternalLink("/product/abc")).toBe("/product/abc");
    expect(resolveInternalLink("/category/Spices")).toBe("/category/Spices");
  });

  it("accepts full site URLs and preserves query parameters", () => {
    expect(resolveInternalLink("https://www.pennyekart.com/category/Spices?sort=new")).toBe(
      "/category/Spices?sort=new",
    );
  });

  it("accepts the apex domain and tolerates trailing slashes", () => {
    expect(resolveInternalLink("https://pennyekart.com/product/abc/")).toBe("/product/abc");
  });

  it("returns null for genuinely external URLs", () => {
    expect(resolveInternalLink("https://wa.me/?text=hi")).toBeNull();
    expect(
      resolveInternalLink("https://play.google.com/store/apps/details?id=com.pennyekart.app"),
    ).toBeNull();
  });

  it("returns null for protocol-relative URLs and unsafe schemes", () => {
    expect(resolveInternalLink("//evil.example/product/1")).toBeNull();
    expect(resolveInternalLink("javascript:alert(1)")).toBeNull();
    expect(resolveInternalLink("data:text/html,hi")).toBeNull();
  });

  it("returns null for lookalike domains", () => {
    expect(resolveInternalLink("https://pennyekart.com.evil.io/product/1")).toBeNull();
    expect(resolveInternalLink("https://notpennyekart.com/product/1")).toBeNull();
  });

  it("returns null for empty or malformed input", () => {
    expect(resolveInternalLink("")).toBeNull();
    expect(resolveInternalLink("not a url at all")).toBeNull();
  });
});

describe("appUrlOpen dedupe", () => {
  it("suppresses a repeated identical link within the window", () => {
    resetDeepLinkDedupe();
    expect(shouldOpenDeepLink("https://www.pennyekart.com/product/1", 1000)).toBe(true);
    expect(shouldOpenDeepLink("https://www.pennyekart.com/product/1", 1500)).toBe(false);
  });

  it("does not suppress a later different link", () => {
    resetDeepLinkDedupe();
    expect(shouldOpenDeepLink("https://www.pennyekart.com/product/1", 1000)).toBe(true);
    expect(shouldOpenDeepLink("https://www.pennyekart.com/product/2", 1200)).toBe(true);
  });

  it("lets the same link through again after the window passes", () => {
    resetDeepLinkDedupe();
    expect(shouldOpenDeepLink("https://www.pennyekart.com/product/1", 1000)).toBe(true);
    expect(shouldOpenDeepLink("https://www.pennyekart.com/product/1", 1000 + 2000)).toBe(true);
  });
});
