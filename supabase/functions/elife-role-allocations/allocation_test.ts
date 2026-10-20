import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { allocatedPanchayathIds, allocatedWards } from "./allocation.ts";

Deno.test("team leader gets all responsible panchayaths, not their home panchayath", () => {
  const row = { panchayath_id: "home", responsible_panchayath_ids: ["p1", "p2", "p3"], responsible_wards: [] };
  assertEquals(allocatedPanchayathIds(row, "team_leader"), ["p1", "p2", "p3"]);
  assertEquals(allocatedWards(row, "team_leader"), []);
});

Deno.test("coordinator gets only their one panchayath plus responsible wards", () => {
  const row = { panchayath_id: "home", responsible_panchayath_ids: [], responsible_wards: ["1", "2", "3"] };
  assertEquals(allocatedPanchayathIds(row, "coordinator"), ["home"]);
  assertEquals(allocatedWards(row, "coordinator"), ["1", "2", "3"]);
});

Deno.test("non-coordinator with no allocation list falls back to home panchayath", () => {
  assertEquals(allocatedPanchayathIds({ panchayath_id: "home", responsible_panchayath_ids: [] }, "admin"), ["home"]);
});
