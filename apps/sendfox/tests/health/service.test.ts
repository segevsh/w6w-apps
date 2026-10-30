import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up, so any severity but `informational` would pin the app at
 * `unknown` forever.
 */
test("service: is a declared absence at informational severity", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.check, "undefined");
  assert((service.unavailable?.reason ?? "").length > 0);
});

test("service: the reason names every host that was checked", () => {
  const reason = service.unavailable?.reason ?? "";
  const hosts = [
    "status.sendfox.com",
    "sendfoxstatus.com",
    "sendfox.statuspage.io",
    "sendfox.instatus.com",
  ];
  for (const host of hosts) {
    assert(reason.includes(host), `reason does not mention ${host}`);
  }
});

test("service: it declares no egress, because there is nothing to fetch", () => {
  assertEquals(service.network, undefined);
  assertEquals(service.credential, undefined);
});
