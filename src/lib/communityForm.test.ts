import { describe, expect, it } from "vitest";
import { defaultCommunityName } from "./communityForm";

describe("defaultCommunityName", () => {
  it("joins name, ward and last 4 digits of mobile with dashes", () => {
    expect(defaultCommunityName("Chockad", 1, "9497589094")).toBe("Chockad-w1-9094");
  });

  it("keeps the given casing of the creator name", () => {
    expect(defaultCommunityName("chockad", 1, "9497589094")).toBe("chockad-w1-9094");
  });

  it("skips the ward part when ward is missing", () => {
    expect(defaultCommunityName("Chockad", null, "9497589094")).toBe("Chockad-9094");
  });

  it("skips the mobile part when mobile is too short", () => {
    expect(defaultCommunityName("Chockad", 1, "9497")).toBe("Chockad-w1-9497");
    expect(defaultCommunityName("Chockad", 1, "949")).toBe("Chockad-w1");
  });

  it("returns empty when the creator has no name", () => {
    expect(defaultCommunityName(null, 1, "9497589094")).toBe("");
    expect(defaultCommunityName("   ", 1, "9497589094")).toBe("");
  });
});
