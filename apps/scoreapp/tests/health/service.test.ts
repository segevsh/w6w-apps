import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

/**
 * The declared absence, pinned as a positive fact rather than a gap.
 *
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok` in
 * the roll-up, so any severity but `informational` would pin this app's health at
 * `unknown` forever.
 */
test("service: is a declared absence at informational severity", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, undefined);
  assertEquals(service.network, undefined);
  assertEquals(typeof service.check, "undefined");
  assertEquals(typeof service.unavailable?.reason, "string");
  assert((service.unavailable?.reason ?? "").length > 0);
});

test("service: no status host is claimed, and both dead ends are named", () => {
  const reason = service.unavailable?.reason ?? "";

  assert(/status\.scoreapp\.com/.test(reason), reason);
  assert(/scoreapp\.statuspage\.io/.test(reason), reason);
  assert(/unclaimed-Statuspage decoy/.test(reason), reason);
  assert(/2026-09-22/.test(reason), reason);
  // The automatable alternative is pointed at, so a reader knows what to run.
  assert(/auth:api-key/.test(reason), reason);
});

test("service: covers everything, and declares no extra egress", () => {
  assertEquals(service.covers, ["*"]);
  assertEquals(service.key, "service");
  assertEquals(service.scope, undefined);
});
