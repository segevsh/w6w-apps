import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: reads the X-RateLimit-* headers off a GET /locations/:locationId probe", async () => {
  const { ctx, calls } = mockHighLevelCtx([{
    body: { location: { id: "loc-1" } },
    headers: {
      "x-ratelimit-limit-daily": "200000",
      "x-ratelimit-daily-remaining": "199000",
      "x-ratelimit-max": "100",
      "x-ratelimit-remaining": "95",
    },
  }], "loc-1");
  const out = await quota.check!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/locations/loc-1");
  assertEquals(out.state, "ok");
  assertEquals(out.quota, [
    { id: "daily", limit: 200000, remaining: 199000, unit: "requests" },
    { id: "burst", limit: 100, remaining: 95, unit: "requests" },
  ]);
});

Deno.test("quota: a near-exhausted bucket degrades the worst-of verdict", async () => {
  const { ctx } = mockHighLevelCtx([{
    body: {},
    headers: {
      "x-ratelimit-limit-daily": "200000",
      "x-ratelimit-daily-remaining": "199000",
      "x-ratelimit-max": "100",
      "x-ratelimit-remaining": "5",
    },
  }]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

Deno.test("quota: no rate-limit headers at all reports unknown", async () => {
  const { ctx } = mockHighLevelCtx([{ body: {}, headers: {} }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: an error response reports unknown", async () => {
  const { ctx } = mockHighLevelCtx([{ status: 500, body: {} }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});
