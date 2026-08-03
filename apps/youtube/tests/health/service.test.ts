import { assert, assertEquals } from "@std/assert";
import check from "../../health/service.ts";

Deno.test("service: is declared unavailable, not faked", () => {
  assertEquals(check.key, "service");
  assertEquals(check.kind, "service");
  assert(check.unavailable, "service must declare why it cannot be probed");
  // A declared absence must have no hook — a hook would contradict the claim.
  assertEquals(check.check, undefined);
});

Deno.test("service: is informational, so a permanent unknown cannot pin the verdict", () => {
  // An `unavailable` entry always reports `unknown`. Without informational
  // severity that unknown would sink the app's roll-up forever.
  assertEquals(check.severity, "informational");
});

Deno.test("service: the reason names the dashboard that was actually checked", () => {
  const reason = check.unavailable!.reason;
  assert(reason.includes("products.json"), "cites the product list that was checked");
  assert(/does not include YouTube/i.test(reason), "states the finding, not a guess");
  assert(reason.includes("status.cloud.google.com"), "rules out the GCP dashboard too");
});

Deno.test("service: widens egress for nothing, since it makes no request", () => {
  assertEquals(check.network, undefined);
  assertEquals(check.feed, undefined);
  assertEquals(check.covers, ["*"]);
});
