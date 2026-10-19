import { assertEquals } from "jsr:@std/assert";
import { parseUpdate, targetError } from "./rules.ts";

const admin = { user_id: "a", is_super_admin: false, role_id: "r1", email: "jam@gmail.com" };

Deno.test("only super admins can edit or delete admins", () => {
  assertEquals(targetError("me", false, admin), "Only super admins can edit or delete admins");
  assertEquals(targetError("me", true, admin), null);
});

Deno.test("super admin accounts cannot be edited or deleted", () => {
  assertEquals(targetError("me", true, { ...admin, is_super_admin: true }), "Super admin accounts cannot be changed here");
});

Deno.test("you cannot edit or delete yourself", () => {
  assertEquals(targetError("a", true, admin), "You cannot edit or delete your own account here");
});

Deno.test("mobile-login users are not admins", () => {
  assertEquals(targetError("me", true, { ...admin, email: "9846293075@pennyekart.in" }), "This account is not an admin");
});

Deno.test("update requires a role", () => {
  assertEquals(parseUpdate({ full_name: "Jam", email: "jam@gmail.com", role_id: "" }), "Select a role");
});
