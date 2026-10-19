import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeMobile, resolveRoleId } from "./match.ts";

const roles = [{ id: "tl", name: "team leader" }, { id: "sa", name: "super admin" }];

Deno.test("mobile matches on last 10 digits", () => {
  assertEquals(normalizeMobile("+91 94975 89095"), "9497589095");
  assertEquals(normalizeMobile("09497589095"), "9497589095");
  assertEquals(normalizeMobile("12345"), "");
});

Deno.test("role names match ignoring case and underscores", () => {
  assertEquals(resolveRoleId("Team_Leader", roles), "tl");
  assertEquals(resolveRoleId("manager", roles), null);
});

Deno.test("super admin is never auto-assigned", () => {
  assertEquals(resolveRoleId("Super Admin", roles), null);
});
