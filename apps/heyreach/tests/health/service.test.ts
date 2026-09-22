import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

/**
 * There IS a real status page — `status.heyreach.io`, self-identifying and
 * CNAMEd to UptimeRobot — and it still is not usable: every Statuspage-shaped
 * path 404s and the only JSON is keyed by a token scraped from the page. The
 * check declares that absence, and the declaration has to stay `informational`
 * or the app's roll-up is pinned at `unknown` forever.
 */
Deno.test("health/service: the status page is a declared absence, not a probe", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  assert(service.unavailable !== undefined);
});

Deno.test("health/service: the reason names the page and why it is unreadable", () => {
  const reason = service.unavailable!.reason;
  assert(/status\.heyreach\.io/.test(reason), reason);
  assert(/UptimeRobot/.test(reason), reason);
  assert(/getMonitorList/.test(reason), reason);
  assert(/api\/v2\/summary\.json/.test(reason), reason);
});
