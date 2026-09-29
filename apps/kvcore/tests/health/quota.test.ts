import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks
 * `ok` in the roll-up, so any severity but `informational` would pin this
 * app at `unknown` forever over a signal kvCORE never promised.
 */
Deno.test("quota: is a declared absence at informational severity", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.check, "undefined");
  assert((quota.unavailable?.reason ?? "").length > 0);
  assert(
    /rate-limit header|quota endpoint/i.test(quota.unavailable?.reason ?? ""),
    "the reason should name what kvCORE does not publish",
  );
});
