import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";
import app from "../../index.ts";

Deno.test("service: declared unavailable, with the evidence in the reason", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assertEquals(service.covers, ["*"]);
  assertEquals(typeof service.check, "undefined");
  assert((service.unavailable?.reason ?? "").length > 0);
  // Each of the four probes that were actually run is named, so the claim is
  // auditable rather than a shrug.
  for (
    const host of [
      "status.cloud.microsoft",
      "status.office365.com",
      "statuspage.io",
      "todo.microsoft.com",
    ]
  ) {
    assert(service.unavailable!.reason.includes(host), `reason does not mention ${host}`);
  }
});

Deno.test("quota: declared unavailable, with the documented ceilings recorded", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(typeof quota.check, "undefined");
  assert((quota.unavailable?.reason ?? "").includes("429"));
  assert((quota.unavailable?.reason ?? "").includes("Retry-After"));
});

Deno.test("health: every unavailable check is informational", () => {
  // An `unavailable` entry always reports `unknown`. The default severity is
  // `degraded`, which would pin this App's roll-up verdict at `unknown`
  // permanently — so a declared absence MUST be informational.
  for (const check of app.healthChecks!) {
    if (check.unavailable) {
      assertEquals(check.severity, "informational", `${check.key} is not informational`);
    }
  }
});

Deno.test("health: no unavailable check widens egress or declares a feed", () => {
  for (const check of app.healthChecks!) {
    if (!check.unavailable) continue;
    assertEquals(check.network, undefined, `${check.key} widens egress but never calls out`);
    assertEquals(check.feed, undefined, `${check.key} declares a feed but has no hook`);
  }
});
