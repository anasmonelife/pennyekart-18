import { describe, expect, it } from "vitest";
import { isCommunityRole, canReviewCommunityRequest } from "./communityAccess";

describe("community access rules", () => {
  it.each(["coordinator", "group leader", "pro"])("allows %s", (role) => {
    expect(isCommunityRole(role)).toBe(true);
  });
  it("does not allow other roles", () => {
    for (const role of ["team leader", "accounts", "back office", "super admin", null]) {
      expect(isCommunityRole(role)).toBe(false);
    }
  });
  it("only lets super administrators review pending requests", () => {
    expect(canReviewCommunityRequest(true, "pending")).toBe(true);
    expect(canReviewCommunityRequest(false, "pending")).toBe(false);
    expect(canReviewCommunityRequest(true, "approved")).toBe(false);
    expect(canReviewCommunityRequest(true, "rejected")).toBe(false);
  });
});