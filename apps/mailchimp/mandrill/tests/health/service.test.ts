import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declared unavailable — status.mailchimp.com publishes no machine-readable feed", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(service.check, undefined);
  assert(service.unavailable, "must declare `unavailable`");
  assert(service.unavailable!.reason.length > 0);
});
