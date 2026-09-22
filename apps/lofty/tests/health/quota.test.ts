import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is a declared absence, not an omission", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.covers, ["*"]);
});

/** Without an informational severity an `unavailable` check pins the app at `unknown`. */
Deno.test("quota: is informational so the absence never worsens a roll-up", () => {
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: the reason says what was checked and what is missing", () => {
  const reason = quota.unavailable?.reason ?? "";
  assert(reason.length > 0, "no reason given");
  assert(/rate-limit/.test(reason), reason);
  assert(/headroom/.test(reason), reason);
});

Deno.test("quota: declares no live hook, because there is nothing to probe", () => {
  assertEquals(quota.check, undefined);
});
