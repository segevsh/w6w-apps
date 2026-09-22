import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declares that no readable headroom exists", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.key, "quota");
  assertEquals(quota.check, undefined);
  assertEquals(quota.unavailable !== undefined, true);
});

Deno.test("quota: informational severity keeps a roll-up off a permanent unknown", () => {
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: the reason names the two headers noCRM only sets on a 429", () => {
  const reason = quota.unavailable?.reason ?? "";
  assertEquals(reason.includes("API-RETRY-AFTER"), true);
  assertEquals(reason.includes("API-LIMIT-RESET"), true);
});
