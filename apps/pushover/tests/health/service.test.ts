import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

/**
 * Pushover's own status page is self-hosted and publishes no machine-readable
 * feed, so there is no probe to run. Declaring the absence is what keeps the
 * app's service health from sitting at `unknown` forever.
 */
Deno.test("service: declared unavailable with a reason, and no check hook", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.check, undefined);
  assert(typeof service.unavailable?.reason === "string" && service.unavailable.reason.length > 0);
});

/**
 * `informational` is load-bearing: at the default `degraded` severity a check
 * that cannot run would drag the app's rolled-up health down permanently.
 */
Deno.test("service: informational, so the absence cannot degrade the app", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.covers, ["*"]);
});

/**
 * The trap this reason exists to close: `pushover.statuspage.io` answers 200
 * with the ~127,700-byte body of an UNCLAIMED Statuspage subdomain. Wiring it up
 * would produce a check that is always green and never about Pushover.
 */
Deno.test("service: the reason records the unclaimed-Statuspage trap", () => {
  const reason = service.unavailable!.reason!;
  assert(reason.includes("statuspage.io"), reason);
  assert(reason.includes("UNCLAIMED") || reason.includes("unclaimed"), reason);
  assert(reason.includes("127,697"), reason);
});

/** No probe means no host to reach — a declared allowlist here would be dead weight. */
Deno.test("service: declares no network allowance", () => {
  assertEquals(service.network, undefined);
});
