import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declares itself unavailable with a stated reason", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assert(quota.unavailable?.reason);
  assertEquals(quota.check, undefined);
});

Deno.test("quota: is informational, so it never worsens a roll-up verdict", () => {
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: the reason names WordPress' own REST API as the reason nothing is readable", () => {
  assert(/WordPress REST API/i.test(quota.unavailable!.reason));
});

Deno.test("quota: widens no egress", () => {
  assertEquals(quota.network, undefined);
});
