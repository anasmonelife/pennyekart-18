// Shared rules for one-tap WhatsApp account verification links.
// The raw token is only ever returned once to the authorized sender; the
// database stores its SHA-256 hash (see the redeem edge function).
export const LINK_TTL_MINUTES = 24 * 60;

export const LINK_ALLOWED_ROLES = ["super admin", "team leader", "coordinator"] as const;

export const MAX_LINKS_PER_HOUR = 10;

export const normalizeMobile = (v: string | null | undefined): string =>
  (v ?? "").replace(/\D/g, "").slice(-10);

export const isAllowedSenderRole = (roleName: string | null | undefined): boolean =>
  LINK_ALLOWED_ROLES.some((r) => r === roleName?.trim().toLowerCase());

export const generateLinkToken = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const buildVerificationLinkUrl = (origin: string, token: string): string =>
  `${origin.replace(/\/+$/, "")}/customer/verify?token=${encodeURIComponent(token)}`;

export const whatsappLinkMessage = (link: string): string =>
  `Pennyekart account verification\n\nTap this link to verify your account automatically:\n${link}\n\nValid for 24 hours. Do not share this link.`;
