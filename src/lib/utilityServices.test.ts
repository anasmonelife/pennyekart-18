import { describe, expect, it } from "vitest";
import { autoCancelLabel, bookingGroup, isAutoCancelledRequest, showUtilityPartnerContact } from "./utilityServices";

describe("automatic cancellation display rules", () => {
  it("identifies only system-cancelled requests as delayed automatic cancellations", () => {
    expect(isAutoCancelledRequest({ status: "cancelled", cancelled_by: "system" })).toBe(true);
    expect(isAutoCancelledRequest({ status: "pending", cancelled_by: "system" })).toBe(false);
    expect(isAutoCancelledRequest({ status: "cancelled", cancelled_by: "customer" })).toBe(false);
    expect(isAutoCancelledRequest({ status: "cancelled" })).toBe(false);
  });

  it("hides partner-side customer contact only for automatically cancelled requests", () => {
    expect(showUtilityPartnerContact({ status: "cancelled", cancelled_by: "system" })).toBe(false);
    for (const status of ["pending", "assigned", "in_progress", "completed"]) {
      expect(showUtilityPartnerContact({ status, cancelled_by: null })).toBe(true);
    }
    expect(showUtilityPartnerContact({ status: "cancelled", cancelled_by: "customer" })).toBe(true);
  });
});

describe("bookingGroup", () => {
  it("keeps unfinished bookings in the Pending tab", () => {
    for (const status of ["pending", "assigned", "in_progress", "quoted"]) {
      expect(bookingGroup(status)).toBe("pending");
    }
  });

  it("moves finished bookings to the Completed tab", () => {
    expect(bookingGroup("completed")).toBe("completed");
  });

  it("keeps cancelled bookings out of Pending and Completed", () => {
    expect(bookingGroup("cancelled")).toBe("cancelled");
  });
});

describe("autoCancelLabel", () => {
  it("is Off when no limit is set", () => {
    expect(autoCancelLabel(null)).toBe("Off");
    expect(autoCancelLabel(undefined)).toBe("Off");
    expect(autoCancelLabel(0)).toBe("Off");
    expect(autoCancelLabel(-5)).toBe("Off");
  });

  it("shows minutes under an hour", () => {
    expect(autoCancelLabel(30)).toBe("30 min");
  });

  it("shows hours under a day", () => {
    expect(autoCancelLabel(120)).toBe("2 hr");
    expect(autoCancelLabel(90)).toBe("1.5 hr");
  });

  it("shows days for a day or more", () => {
    expect(autoCancelLabel(1440)).toBe("1 day");
    expect(autoCancelLabel(2880)).toBe("2 days");
  });
});
