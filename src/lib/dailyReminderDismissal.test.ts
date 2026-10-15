import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { areDailyRemindersDismissed, dismissDailyReminders } from "./dailyReminderDismissal";

describe("daily reminder dismissal", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("suppresses reminders for the selected user and role until the next day", () => {
    expect(areDailyRemindersDismissed("delivery", "staff-1")).toBe(false);
    dismissDailyReminders("delivery", "staff-1");
    expect(areDailyRemindersDismissed("delivery", "staff-1")).toBe(true);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(areDailyRemindersDismissed("delivery", "staff-1")).toBe(false);
  });

  it("keeps dismissals isolated between users and partner roles", () => {
    dismissDailyReminders("seller", "seller-1");
    expect(areDailyRemindersDismissed("seller", "seller-1")).toBe(true);
    expect(areDailyRemindersDismissed("utility", "seller-1")).toBe(false);
    expect(areDailyRemindersDismissed("seller", "seller-2")).toBe(false);
  });
});