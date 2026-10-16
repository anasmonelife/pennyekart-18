import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { canRecordContactAttempt, CONTACT_ATTEMPT_MESSAGE } from "./contactAttempt.ts";

Deno.test("allows one alert for an open order", () => {
  assertEquals(canRecordContactAttempt("shipped", null), true);
});

Deno.test("prevents a second alert for the same order", () => {
  assertEquals(canRecordContactAttempt("shipped", "2026-10-16T10:00:00Z"), false);
});

Deno.test("prevents alerts for completed orders", () => {
  assertEquals(canRecordContactAttempt("delivered", null), false);
});

Deno.test("uses the fixed customer contact message", () => {
  assertEquals(
    CONTACT_ATTEMPT_MESSAGE,
    "We’re trying to contact you about your delivery. Please answer the call or contact your delivery staff.",
  );
});