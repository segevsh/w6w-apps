import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is a declared absence at informational severity", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.check, "undefined");
  assert(
    /X-RateLimit-Limit|X-RateLimit-Remaining|Retry-After/i.test(quota.unavailable?.reason ?? ""),
    "the reason should name the headers RingCentral does not send",
  );
});
