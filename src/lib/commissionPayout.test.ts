import { describe, expect, it } from "vitest";
import {
  commissionAmount,
  commissionRange,
  overlapsCommissionPeriod,
  payoutHeld,
  payoutRequestable,
  PAYOUT_HOLD_PERCENT,
} from "./commissionPayout";

describe("community commission payments", () => {
  it("divides community profit using the configured role rate", () => {
    expect(commissionAmount(500, 12)).toBe(60);
  });
  it("rounds the allocated commission to currency precision", () => {
    expect(commissionAmount(123.45, 12)).toBe(14.81);
  });
  it("does not create a negative commission from a loss", () => {
    expect(commissionAmount(-500, 12)).toBe(0);
  });
  it("blocks a repeat or overlapping date period", () => {
    expect(overlapsCommissionPeriod({ period_from: "2026-10-01", period_to: "2026-10-20" }, "2026-10-20", "2026-10-31")).toBe(true);
    expect(overlapsCommissionPeriod({ period_from: "2026-10-01", period_to: "2026-10-20" }, "2026-10-21", "2026-10-31")).toBe(false);
  });
  it("includes the entire selected date period in India time", () => {
    expect(commissionRange("2026-10-01", "2026-10-20")).toEqual({ from: "2026-09-30T18:30:00.000Z", to: "2026-10-20T18:29:59.999Z" });
  });
});