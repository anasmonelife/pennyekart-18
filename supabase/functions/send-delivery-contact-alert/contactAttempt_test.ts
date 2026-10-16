import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  canRecordContactAttempt,
  CONTACT_ATTEMPT_MESSAGE,
  isAssignedDeliveryStaff,
} from "./contactAttempt.ts";

Deno.test("allows one alert for an open order", () => {
  assertEquals(canRecordContactAttempt("shipped", null), true);
});

Deno.test("prevents a second alert for the same order", () => {
  assertEquals(canRecordContactAttempt("shipped", "2026-10-16T10:00:00Z"), false);
});

Deno.test("prevents alerts for completed orders", () => {
  assertEquals(canRecordContactAttempt("delivered", null), false);
});

Deno.test("prevents alerts for return orders", () => {
  assertEquals(canRecordContactAttempt("return_requested", null), false);
});

Deno.test("allows only the assigned delivery staff member", () => {
  assertEquals(isAssignedDeliveryStaff("staff-1", "staff-1"), true);
  assertEquals(isAssignedDeliveryStaff("staff-1", "staff-2"), false);
  assertEquals(isAssignedDeliveryStaff(null, "staff-1"), false);
});

Deno.test("uses the fixed customer contact message", () => {
  assertEquals(
    CONTACT_ATTEMPT_MESSAGE,
    "We’re trying to contact you about your delivery. Please answer the call or contact your delivery staff.",
  );
});