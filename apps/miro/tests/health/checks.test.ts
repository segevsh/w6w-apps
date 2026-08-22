import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";

Deno.test("service: declares the status host on its own allowlist", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.miro.com"]);
});

/**
 * Miro's summary.json returns `"components": []` — an empty array, not a parse
 * failure — so the smaller status.json is the honest probe, unlike every other
 * app in this pack.
 */
Deno.test("service: reads status.json, not summary.json", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { status: { indicator: "none", description: "All Systems Operational" } },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://status.miro.com/api/v2/status.json");
  assertEquals(result.state, "ok");
  assertEquals(result.message, "All Systems Operational");
  // Nothing invented: Miro publishes no components, so none are reported.
  assertEquals(result.components, undefined);
});

Deno.test("service: minor degrades, major and critical are down", async () => {
  for (
    const [indicator, state] of [["minor", "degraded"], ["major", "down"], ["critical", "down"]]
  ) {
    const { ctx } = mockCtx([{ status: 200, body: { status: { indicator } } }]);
    assertEquals((await service.check!({} as never, ctx)).state, state, indicator);
  }
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

Deno.test("quota: is a declared absence — Miro publishes cost, never balance", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable?.reason.includes("credits"));
  assert(quota.unavailable?.reason.includes("x-ratelimit"));
  // An `unavailable` entry always reports `unknown`, which would pin the
  // verdict at any other severity.
  assertEquals(quota.severity, "informational");
});
