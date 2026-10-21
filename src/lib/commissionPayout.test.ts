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

describe("sales commission payout requests", () => {
  it("holds 20% of the sales commission", () => {
    expect(PAYOUT_HOLD_PERCENT).toBe(20);
    expect(payoutHeld(500)).toBe(100);
  });

  it("limits the requestable amount to 80% of total sales commission", () => {
    expect(payoutRequestable(500, 0)).toBe(400);
  });

  it("counts pending, verified and approved requests against the limit", () => {
    expect(payoutRequestable(500, 150)).toBe(250);
  });

  it("never allows a request above the held limit", () => {
    expect(payoutRequestable(500, 600)).toBe(0);
  });

  it("does not go negative from rounding or bad input", () => {
    expect(payoutRequestable(-50, 0)).toBe(0);
    expect(payoutRequestable(33.33, 0)).toBe(26.66);
  });
});