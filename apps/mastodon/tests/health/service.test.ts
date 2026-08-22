import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

/** A different shape of absence: not "publishes nothing", but "has no vendor". */
Deno.test("service: is declared unavailable rather than left out", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(typeof service.check, "undefined");
  assert(service.unavailable?.reason, "no reason recorded");
});

Deno.test("service: carries informational severity", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
});

Deno.test("service: the reason is dated and explains there is no service", () => {
  const reason = service.unavailable!.reason!;
  assert(/2026-08-18/.test(reason), "the claim is undated");
  assert(/no Mastodon service to have a status/.test(reason), reason);
  assert(/joinmastodon\.org/.test(reason), reason);
});

/** Instances do publish status pages; none of them can be found from here. */
Deno.test("service: it explains why per-instance pages cannot be used either", () => {
  const reason = service.unavailable!.reason!;
  assert(/no registry and no convention/.test(reason), reason);
});

Deno.test("service: it names the check that answers the question that does exist", () => {
  assert(
    /`instance` dependency check/.test(service.unavailable!.reason!),
    service.unavailable!.reason,
  );
});
