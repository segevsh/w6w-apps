import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: a declared absence, informational, with a verified reason", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(service.check, undefined);
  assert(/Hund/.test(service.unavailable!.reason));
  assert(/US\/EU 'RESTful API'/.test(service.unavailable!.reason));
});
