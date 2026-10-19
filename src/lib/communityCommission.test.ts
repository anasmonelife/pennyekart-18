import { describe, expect, it } from "vitest";
import {
  commissionForProfit,
  commissionRateForRole,
  isValidCommissionRule,
} from "./communityCommission";

describe("community commission rules", () => {
  it("accepts a rate within the configured range", () => {
    expect(isValidCommissionRule({ minimum: 5, maximum: 30, rate: 12 })).toBe(true);
  });

  it("rejects a rate outside its selected role range", () => {
    expect(isValidCommissionRule({ minimum: 5, maximum: 30, rate: 31 })).toBe(false);
  });

  it("calculates commission using the community creator's role rate", () => {
    const rules = { leader: { minimum: 5, maximum: 30, rate: 12 } };
    expect(commissionRateForRole("leader", rules, 10)).toBe(12);
    expect(commissionForProfit(250, "leader", rules, 10)).toBe(30);
  });

  it("uses the saved fallback rate when a creator has no role rule", () => {
    expect(commissionForProfit(250, null, {}, 10)).toBe(25);
  });
});