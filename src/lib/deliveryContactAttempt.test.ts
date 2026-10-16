import { describe, expect, it } from "vitest";
import { canNotifyCustomerAboutDelivery } from "./deliveryContactAttempt";

describe("delivery customer contact alerts", () => {
  it("allows an open order before its first alert", () => {
    expect(canNotifyCustomerAboutDelivery("shipped", null)).toBe(true);
  });

  it("prevents sending a second alert for the same order", () => {
    expect(canNotifyCustomerAboutDelivery("shipped", "2026-10-16T10:00:00Z")).toBe(false);
  });

  it("prevents sending an alert for a completed order", () => {
    expect(canNotifyCustomerAboutDelivery("delivered", null)).toBe(false);
  });
});