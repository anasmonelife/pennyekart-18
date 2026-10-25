// Client-side rules for the WhatsApp verification link option (mirrors
// supabase/functions/_shared/verificationLink.ts; the server re-checks
// everything, so this is presentation-only).
export const VERIFICATION_LINK_ROLES = ["super admin", "team leader", "coordinator"] as const;

export const VERIFICATION_LINK_TTL_LABEL = "24 hours";

export const canSendVerificationLink = (
  isSuperAdmin: boolean,
  roleName: string | null | undefined,
): boolean =>
  isSuperAdmin ||
  VERIFICATION_LINK_ROLES.some((r) => r === roleName?.trim().toLowerCase());

export const normalizeVerificationMobile = (v: string | null | undefined): string =>
  (v ?? "").replace(/\D/g, "").slice(-10);

export const buildVerificationLink = (origin: string, token: string): string =>
  `${origin.replace(/\/+$/, "")}/customer/verify?token=${encodeURIComponent(token)}`;

export const verificationWhatsAppMessage = (link: string): string =>
  `Pennyekart account verification\n\nTap this link to verify your account automatically:\n${link}\n\nValid for 24 hours. Do not share this link.`;
