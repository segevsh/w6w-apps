import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up, so any severity but `informational` would pin the app at
 * `unknown` forever.
 */
Deno.test("service: is a declared absence at informational severity", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.check, "undefined");
  assert((service.unavailable?.reason ?? "").length > 0);
});

Deno.test("service: the reason names the checked-and-rejected feed paths, not just 'no page'", () => {
  const reason = service.unavailable?.reason ?? "";
  assert(/status\.ringcentral\.com/.test(reason), reason);
  assert(/summary\.json/.test(reason), reason);
  assert(/statusapi\.ext\.ringcentral\.com/.test(reason), reason);
});
