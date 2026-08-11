import { assert, assertEquals } from "@std/assert";
import planLimits from "../../health/plan-limits.ts";

Deno.test("health/plan-limits: is a declared absence, not a silent gap", () => {
  assertEquals(typeof planLimits.check, "undefined");
  assert(planLimits.unavailable?.reason);
});

Deno.test("health/plan-limits: is `informational`, or it pins the app at unknown forever", () => {
  // An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
  // in the roll-up. At any other severity this would be a permanent amber light.
  assertEquals(planLimits.severity, "informational");
});

Deno.test("health/plan-limits: the reason names what was checked and what IS readable", () => {
  const reason = planLimits.unavailable!.reason;
  assert(reason.includes("507"), "does not name the symptom");
  assert(reason.includes("OpenAPI"), "does not say what surface was searched");
  assert(reason.includes("`quota` check"), "does not point at the half that IS readable");
});
