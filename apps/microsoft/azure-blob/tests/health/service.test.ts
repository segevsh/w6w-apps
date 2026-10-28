import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: is declared unavailable, with no live probe", () => {
  assertEquals(typeof service.check, "undefined");
  assert(service.unavailable, "service declares no reason");
  assertEquals(service.kind, "service");
});

/** Prose matching is how a check ends up confidently wrong. */
Deno.test("service: the reason is the feed's shape, not its absence", () => {
  const reason = service.unavailable!.reason;
  assert(/RSS feed of incident announcements/.test(reason), reason);
  assert(/English prose/.test(reason), reason);
  assert(/no per-service state to read/.test(reason), reason);
});

Deno.test("service: names both ways prose matching would fail", () => {
  const reason = service.unavailable!.reason;
  assert(/historical incident as a current outage/.test(reason), reason);
  assert(/misses a live one that is worded differently/.test(reason), reason);
});

/** Azure Storage health is per region and per account. */
Deno.test("service: says the app-scoped question is the wrong one, and which check answers it", () => {
  const reason = service.unavailable!.reason;
  assert(/per REGION and per storage account/.test(reason), reason);
  assert(/`account` check/.test(reason), reason);
});

/** There is a real per-subscription API; it is a different product. */
Deno.test("service: points at Azure Service Health and says why it is out of reach", () => {
  const reason = service.unavailable!.reason;
  assert(/Azure Service Health API/.test(reason), reason);
  assert(/not reachable with a storage account key/.test(reason), reason);
  assertEquals(service.severity, "informational");
});
