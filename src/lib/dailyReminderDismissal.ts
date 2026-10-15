export type ReminderRole = "delivery" | "seller" | "utility";

const dismissalKey = (role: ReminderRole, userId: string) =>
  `daily_reminders_dismissed_${role}_${userId}`;

export function dismissDailyReminders(role: ReminderRole, userId?: string, date = new Date()): void {
  if (!userId) return;
  try {
    localStorage.setItem(dismissalKey(role, userId), date.toDateString());
  } catch {
    // The popup can still close if browser storage is unavailable.
  }
}

export function areDailyRemindersDismissed(role: ReminderRole, userId?: string, date = new Date()): boolean {
  if (!userId) return false;
  try {
    return localStorage.getItem(dismissalKey(role, userId)) === date.toDateString();
  } catch {
    return false;
  }
}