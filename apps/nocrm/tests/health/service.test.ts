import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";

test("service: declares the absence rather than probing a fake feed", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.key, "service");
  assertEquals(service.check, undefined);
  assertEquals(service.feed, undefined);
  assertEquals(service.unavailable !== undefined, true);
});

test("service: informational severity keeps a roll-up off a permanent unknown", () => {
  assertEquals(service.severity, "informational");
});

test("service: the reason cites the evidence that no status page exists", () => {
  const reason = service.unavailable?.reason ?? "";
  assertEquals(reason.includes("status.nocrm.io"), true);
  assertEquals(reason.includes("Compte+introuvable"), true);
  assertEquals(reason.includes("summary.json"), true);
  assertEquals(reason.includes("auth:api-key"), true);
});
