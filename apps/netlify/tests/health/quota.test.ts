import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: parses X-RateLimit-* headers", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: { id: "u1" },
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": "500",
        "x-ratelimit-remaining": "450",
        "x-ratelimit-reset": "1372700873",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 450);
  assertEquals(report.quota?.[0].limit, 500);
  assertEquals(report.quota?.[0].resetAt, new Date(1372700873 * 1000).toISOString());
});

Deno.test("quota: low headroom (<10% remaining) degrades", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {},
      headers: { "x-ratelimit-limit": "500", "x-ratelimit-remaining": "10" },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: zero remaining reports down", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {},
      headers: { "x-ratelimit-limit": "500", "x-ratelimit-remaining": "0" },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: missing X-RateLimit-Remaining header reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {}, headers: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
