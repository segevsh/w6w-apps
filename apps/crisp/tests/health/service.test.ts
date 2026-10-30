import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

test("health/service: declares the Vigil status host, unauthenticated", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.crisp.chat"]);
});

test("health/service: maps Vigil's three text states", async () => {
  for (
    const [text, state] of [["healthy", "ok"], ["sick", "degraded"], ["dead", "down"]] as const
  ) {
    const { ctx } = mockCtx([{ body: text, headers: { "content-type": "text/plain" } }]);
    const report = await service.check!({}, ctx);
    assertEquals(report.state, state);
  }
});

test("health/service: probes GET /status/text/ on the status host", async () => {
  const { ctx, calls } = mockCtx([{ body: "healthy", headers: { "content-type": "text/plain" } }]);
  await service.check!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "status.crisp.chat");
  assertEquals(url.pathname, "/status/text/");
});

test("health/service: an unreachable status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("health/service: an unrecognized body reports unknown rather than guessing", async () => {
  const { ctx } = mockCtx([{ body: "banana", headers: { "content-type": "text/plain" } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
