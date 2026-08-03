import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declares itself unavailable with a stated reason", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assert(service.unavailable?.reason);
  assertEquals(service.check, undefined);
});

Deno.test("service: is informational, so a declared absence never pins the verdict", () => {
  // An `unavailable` entry always reports `unknown`, and `unknown` outranks
  // `ok` in the roll-up — at any other severity this would peg the App at
  // `unknown` forever.
  assertEquals(service.severity, "informational");
});

Deno.test("service: names the self-hosted model rather than pointing at a marketing site", () => {
  const reason = service.unavailable!.reason;
  assert(/self-hosted/i.test(reason));
  assert(reason.includes("`site` check"));
});

Deno.test("service: declares no feed and widens no egress", () => {
  assertEquals(service.feed, undefined);
  assertEquals(service.network, undefined);
});
