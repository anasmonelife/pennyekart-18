export const CONTACT_ATTEMPT_TITLE = "Delivery update";
export const CONTACT_ATTEMPT_MESSAGE =
  "We’re trying to contact you about your delivery. Please answer the call or contact your delivery staff.";

const CLOSED_STATUSES = new Set(["delivered", "cancelled", "return_confirmed"]);

export const canRecordContactAttempt = (status: string, attemptedAt: string | null) =>
  !attemptedAt && !CLOSED_STATUSES.has(status);