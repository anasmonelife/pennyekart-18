import { describe, expect, it } from "vitest";
import {
  buildVerificationLink,
  canSendVerificationLink,
  normalizeVerificationMobile,
  verificationWhatsAppMessage,
} from "./accountVerification";

describe("verification link sender eligibility", () => {
  it("allows the three designated roles", () => {
    expect(canSendVerificationLink(false, "super admin")).toBe(true);
    expect(canSendVerificationLink(false, "team leader")).toBe(true);
    expect(canSendVerificationLink(false, "coordinator")).toBe(true);
  });

  it("matches role names case-insensitively and trims space", () => {
    expect(canSendVerificationLink(false, "Team Leader")).toBe(true);
    expect(canSendVerificationLink(false, " coordinator ")).toBe(true);
  });

  it("rejects other roles and missing roles", () => {
    expect(canSendVerificationLink(false, "pro")).toBe(false);
    expect(canSendVerificationLink(false, "group leader")).toBe(false);
    expect(canSendVerificationLink(false, null)).toBe(false);
    expect(canSendVerificationLink(false, undefined)).toBe(false);
  });

  it("always allows a super admin", () => {
    expect(canSendVerificationLink(true, null)).toBe(true);
    expect(canSendVerificationLink(true, "pro")).toBe(true);
  });
});

describe("verification link helpers", () => {
  it("normalizes mobile numbers to 10 digits", () => {
    expect(normalizeVerificationMobile("+91 91234 56789")).toBe("9123456789");
    expect(normalizeVerificationMobile("91234567890")).toBe("1234567890");
    expect(normalizeVerificationMobile(null)).toBe("");
  });

  it("builds the link on the verify route with the token encoded", () => {
    const link = buildVerificationLink("https://app.example.com/", "abc/123");
    expect(link).toBe("https://app.example.com/customer/verify?token=abc%2F123");
  });

  it("puts the link and 24-hour validity in the WhatsApp message", () => {
    const msg = verificationWhatsAppMessage("https://app.example.com/customer/verify?token=t");
    expect(msg).toContain("https://app.example.com/customer/verify?token=t");
    expect(msg).toContain("24 hours");
  });
});
