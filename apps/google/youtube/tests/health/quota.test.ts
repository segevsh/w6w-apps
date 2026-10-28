import { assert, assertEquals } from "@std/assert";
import check from "../../health/quota.ts";

Deno.test("quota: is declared unavailable with no hook", () => {
  assertEquals(check.key, "quota");
  assertEquals(check.kind, "quota");
  assert(check.unavailable);
  assertEquals(check.check, undefined);
  assertEquals(check.severity, "informational");
  assertEquals(check.covers, ["*"]);
});

Deno.test("quota: the reason states the real cost model rather than shrugging", () => {
  const reason = check.unavailable!.reason;
  // The point of this entry is that YouTube documents its costs unusually well
  // even though it exposes no headroom — both halves must be present.
  assert(/no headroom endpoint/i.test(reason), "says headroom is unreadable");
  assert(reason.includes("10,000"), "states the shared daily allowance");
  assert(reason.includes("units, not requests"), "names the unit model");
  assert(/100 calls for search\.list/i.test(reason), "states the separate search bucket");
  assert(/100 calls for videos\.insert/i.test(reason), "states the separate insert bucket");
  assert(/list read costs 1 unit/i.test(reason), "states the read cost");
  assert(/write costs 50/i.test(reason), "states the write cost");
  assert(/midnight Pacific/i.test(reason), "states the reset time");
  assert(/quotaExceeded/.test(reason), "names the error exhaustion actually surfaces as");
});
