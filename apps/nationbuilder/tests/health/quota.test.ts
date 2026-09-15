import { assert, assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: reads RateLimit-* headers, treating Reset as a Unix timestamp", async () => {
  const resetAt = Math.floor(Date.now() / 1000) + 10;
  const { ctx, calls } = mockNationBuilderCtx([{
    status: 200,
    headers: {
      "content-type": "application/json",
      "ratelimit-limit": "250",
      "ratelimit-remaining": "220",
      "ratelimit-reset": String(resetAt),
    },
    body: { data: { id: "1" } },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].limit, 250);
  assertEquals(report.quota?.[0].remaining, 220);
  assertEquals(report.quota?.[0].resetAt, new Date(resetAt * 1000).toISOString());
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/signups/me");
});

Deno.test("quota: near-exhausted headroom degrades", async () => {
  const { ctx } = mockNationBuilderCtx([{
    headers: {
      "content-type": "application/json",
      "ratelimit-limit": "250",
      "ratelimit-remaining": "10",
    },
    body: {},
  }]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

Deno.test("quota: zero remaining is down", async () => {
  const { ctx } = mockNationBuilderCtx([{
    headers: { "content-type": "application/json", "ratelimit-remaining": "0" },
    body: {},
  }]);
  assertEquals((await quota.check!({}, ctx)).state, "down");
});

Deno.test("quota: no RateLimit-* headers is unknown", async () => {
  const { ctx } = mockNationBuilderCtx([{
    headers: { "content-type": "application/json" },
    body: {},
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no RateLimit-*"));
});

Deno.test("quota: a connection with no slug is unknown, not down", async () => {
  const { ctx } = mockNationBuilderCtx([]);
  (ctx as { connection?: unknown }).connection = { display: {} };
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no nation slug"));
});

Deno.test("quota: is informational so it never worsens the overall verdict", () => {
  assertEquals(quota.severity, "informational");
});
