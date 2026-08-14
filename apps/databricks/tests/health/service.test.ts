import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

/**
 * There is no "is Databricks up" signal to read: every workspace is a separate
 * per-customer deployment on the customer's own cloud account, and the vendor
 * publishes no aggregate machine-readable feed across them. Declaring the
 * absence is what keeps the app's service health from sitting at `unknown`
 * forever — and `workspace` is the check that answers the question that does
 * apply to a given Connection.
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
  assertEquals(service.credential, "none");
});

/** The description points at the check that does apply, so the gap is not a dead end. */
Deno.test("service: points the reader at the workspace check", () => {
  assert((service.description ?? "").includes("workspace"), service.description);
  assert(service.unavailable!.reason!.includes("per-customer"), service.unavailable!.reason);
});
