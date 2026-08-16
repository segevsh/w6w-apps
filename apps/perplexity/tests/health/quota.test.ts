import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up, so any severity but `informational` would pin the app at
 * `unknown` forever.
 */
Deno.test("quota: is a declared absence at informational severity", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.check, "undefined");
  assert((quota.unavailable?.reason ?? "").length > 0);
  assert(
    /x-ratelimit/i.test(quota.unavailable?.reason ?? ""),
    "the reason should name the header Perplexity does not send",
  );
});
