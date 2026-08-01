import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: reports ok headroom from ratelimit-* headers", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: { abilities: [] },
      headers: {
        "content-type": "application/json",
        "ratelimit-limit": "960",
        "ratelimit-remaining": "900",
        "ratelimit-reset": "30",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].limit, 960);
  assertEquals(report.quota?.[0].remaining, 900);
  assertEquals(report.quota?.[0].unit, "requests");
  // ratelimit-reset is a duration in seconds, not an epoch — resetAt must be in the future.
  const resetAt = new Date(report.quota![0].resetAt!).getTime();
  assertEquals(resetAt > Date.now(), true);
});

Deno.test("quota: reports degraded when headroom drops below 10%", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {},
      headers: { "ratelimit-limit": "1000", "ratelimit-remaining": "50" },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: reports down when remaining is zero", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: {}, headers: { "ratelimit-limit": "1000", "ratelimit-remaining": "0" } },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: reports unknown when the headers are absent", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: { "content-type": "application/json" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: reports unknown on a non-2xx probe response", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: is informational and needs no extra network.allow (signed posture)", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
});
