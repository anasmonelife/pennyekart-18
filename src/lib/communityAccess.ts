export const COMMUNITY_ROLES = ["coordinator", "group leader", "pro"] as const;

export const isCommunityRole = (name: string | null | undefined) =>
  COMMUNITY_ROLES.some((role) => role === name?.trim().toLowerCase());

export const canReviewCommunityRequest = (isSuperAdmin: boolean, status: string) =>
  isSuperAdmin && status === "pending";