import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declares the gap rather than omitting the check", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assert(service.unavailable, "must carry an `unavailable` entry");
  assertEquals(typeof service.unavailable.reason, "string");
  assert(service.unavailable.reason.length > 0);
});

Deno.test("service: has no check hook and no egress — there is nothing to probe", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.network, undefined);
});

Deno.test("service: severity is informational so it never pins the verdict at unknown", () => {
  // An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
  // in the roll-up. At any other severity this would permanently degrade the app.
  assertEquals(service.severity, "informational");
});

Deno.test("service: the reason names what was probed, not just that nothing exists", () => {
  const reason = service.unavailable!.reason;
  assert(reason.includes("status.flodesk.com"), "names the host that does not resolve");
  assert(reason.includes("statuspage.io"), "names the unclaimed subdomain");
  assert(
    /text\/html|redirect/i.test(reason),
    "records that the 200 was an HTML catch-all, not a status API",
  );
});
