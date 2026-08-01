import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: parses the comma-separated 15min,daily pair from both headers", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: { id: 1 },
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": "600,30000",
        "x-ratelimit-usage": "100,5000",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0], {
    id: "15min",
    limit: 600,
    remaining: 500,
    unit: "requests/15min",
  });
  assertEquals(report.quota?.[1], {
    id: "daily",
    limit: 30000,
    remaining: 25000,
    unit: "requests/day",
  });
});

Deno.test("quota: Strava's own docs example (600,30000 / 314,27536) leaves the daily window under 10% headroom", async () => {
  // developers.strava.com/docs/rate-limits/ shows this exact pair as a
  // "healthy" example response — but 2464/30000 remaining is ~8.2%, so this
  // check's own <10% threshold correctly flags it rather than trusting the
  // vendor's framing.
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {},
      headers: { "x-ratelimit-limit": "600,30000", "x-ratelimit-usage": "314,27536" },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.components?.["15min"].state, "ok");
  assertEquals(report.components?.daily.state, "degraded");
});

Deno.test("quota: low headroom (<10% remaining) on either window degrades", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {},
      headers: { "x-ratelimit-limit": "600,30000", "x-ratelimit-usage": "590,100" },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.components?.["15min"].state, "degraded");
  assertEquals(report.components?.daily.state, "ok");
});

Deno.test("quota: zero remaining on a window reports down", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {},
      headers: { "x-ratelimit-limit": "600,30000", "x-ratelimit-usage": "600,100" },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: missing headers report unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {}, headers: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
