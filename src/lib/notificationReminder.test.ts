import { describe, it, expect, vi, beforeEach } from "vitest";

const enableNotifications = vi.hoisted(() => vi.fn(async () => true));
const isNativeApp = vi.hoisted(() => vi.fn(() => false));

vi.mock("@/lib/native", () => ({ isNativeApp, enableNotifications }));

const loadModule = async () => {
  vi.resetModules();
  return import("@/lib/notificationReminder");
};

const lastAsked = () => Number(localStorage.getItem("pennyekart_push_last_asked_at") || 0);

beforeEach(() => {
  localStorage.clear();
  enableNotifications.mockClear();
});

describe("maybeAskForNotifications", () => {
  it("asks on the first sign-in when no permission and no recent ask", async () => {
    const { maybeAskForNotifications } = await loadModule();
    await maybeAskForNotifications();
    expect(enableNotifications).toHaveBeenCalledTimes(1);
    expect(lastAsked()).toBeGreaterThan(0);
  });

  it("does not ask again within the same week", async () => {
    const { maybeAskForNotifications } = await loadModule();
    await maybeAskForNotifications();
    await maybeAskForNotifications();
    expect(enableNotifications).toHaveBeenCalledTimes(1);
  });

  it("asks again once a week has passed", async () => {
    localStorage.setItem("pennyekart_push_last_asked_at", String(Date.now() - 8 * 24 * 60 * 60 * 1000));
    const { maybeAskForNotifications } = await loadModule();
    await maybeAskForNotifications();
    expect(enableNotifications).toHaveBeenCalledTimes(1);
  });

  it("does not ask when notifications are already granted", async () => {
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: { permission: "granted" },
    });
    const { maybeAskForNotifications } = await loadModule();
    await maybeAskForNotifications();
    expect(enableNotifications).not.toHaveBeenCalled();
    expect(lastAsked()).toBe(0);
  });
});
