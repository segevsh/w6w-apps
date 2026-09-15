import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("check - reads the ratelimit-* headers observed live on api.float.com", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: [],
      headers: {
        "content-type": "application/json",
        "ratelimit-limit": "200",
        "ratelimit-remaining": "199",
        "ratelimit-reset": "19",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].limit, 200);
  assertEquals(report.quota?.[0].remaining, 199);
  assertEquals(calls[0].url, "https://api.float.com/v3/departments?per-page=1");
});

Deno.test("check - falls back to the x-ratelimit-*-minute header names when the draft form is absent", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: [],
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit-minute": "200",
        "x-ratelimit-remaining-minute": "150",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.quota?.[0].limit, 200);
  assertEquals(report.quota?.[0].remaining, 150);
});

Deno.test("check - near-exhaustion (>= 90% used) reports degraded, not ok", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: [],
      headers: {
        "content-type": "application/json",
        "ratelimit-limit": "200",
        "ratelimit-remaining": "10",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("check - exhausted budget is degraded, never down (it recovers every minute)", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: [],
      headers: {
        "content-type": "application/json",
        "ratelimit-limit": "200",
        "ratelimit-remaining": "0",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("check - a response with neither header family is unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [],
    headers: { "content-type": "application/json" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("check - a refused probe is unknown, not a headroom verdict", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { name: "Unauthorized" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
