import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is a declared absence at informational severity", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.check, "undefined");
  assert((quota.unavailable?.reason ?? "").length > 0);
  assert(
    /X-RateLimit-\*|RateLimit-\*/.test(quota.unavailable?.reason ?? ""),
    "the reason should name the header shape Mindee does not send",
  );
  assert(
    /200 enqueue.*1,200 polling/.test(quota.unavailable?.reason ?? ""),
    "the reason should name the documented fixed ceilings",
  );
});
