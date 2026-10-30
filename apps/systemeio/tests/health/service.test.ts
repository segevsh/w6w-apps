import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declared unavailable, informational severity", () => {
  assertEquals(typeof service.check, "undefined");
  assert(service.unavailable, "expected a declared absence");
  assertEquals(service.severity, "informational");
  assert(service.unavailable.reason.length > 0);
});

test("service: the reason names the unclaimed-subdomain evidence, not just 'no status page'", () => {
  const reason = service.unavailable!.reason;
  assert(/statuspage\.io/i.test(reason), reason);
  assert(/instatus/i.test(reason), reason);
  assert(/127,696/.test(reason), reason);
});
