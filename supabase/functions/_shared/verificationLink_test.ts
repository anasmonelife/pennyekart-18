import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  LINK_ALLOWED_ROLES,
  buildVerificationLinkUrl,
  generateLinkToken,
  isAllowedSenderRole,
  normalizeMobile,
  whatsappLinkMessage,
} from "./verificationLink.ts";

Deno.test("only super admin, team leader and coordinator can send links", () => {
  for (const role of LINK_ALLOWED_ROLES) assertEquals(isAllowedSenderRole(role), true);
  assertEquals(isAllowedSenderRole("Team Leader"), true);
  assertEquals(isAllowedSenderRole(" coordinator "), true);
  assertEquals(isAllowedSenderRole("pro"), false);
  assertEquals(isAllowedSenderRole("group leader"), false);
  assertEquals(isAllowedSenderRole(null), false);
});

Deno.test("mobile numbers normalize to 10 digits", () => {
  assertEquals(normalizeMobile("+91 91234 56789"), "9123456789");
  assertEquals(normalizeMobile("91234567890"), "1234567890");
  assertEquals(normalizeMobile(null), "");
});

Deno.test("tokens are 64 hex characters", () => {
  const token = generateLinkToken();
  assertEquals(token.length, 64);
  assertEquals(/^[0-9a-f]{64}$/.test(token), true);
});

Deno.test("link URL targets the verify route with the token encoded", () => {
  assertEquals(
    buildVerificationLinkUrl("https://app.example.com/", "abc/123"),
    "https://app.example.com/customer/verify?token=abc%2F123",
  );
});

Deno.test("WhatsApp message carries the link and 24-hour validity", () => {
  const msg = whatsappLinkMessage("https://app.example.com/customer/verify?token=t");
  assertEquals(msg.includes("https://app.example.com/customer/verify?token=t"), true);
  assertEquals(msg.includes("24 hours"), true);
});
