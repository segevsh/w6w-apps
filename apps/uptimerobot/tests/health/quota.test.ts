import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: reads X-RateLimit-* headers and reports ok headroom", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "10",
      "x-ratelimit-remaining": "7",
      "x-ratelimit-reset": "1780000000",
    },
    body: { stat: "ok" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{
    id: "requests",
    limit: 10,
    remaining: 7,
    resetAt: new Date(1780000000 * 1000).toISOString(),
    unit: "requests/min",
  }]);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/getAccountDetails");
});

Deno.test("quota: zero headroom is degraded, not down (still working, just tight)", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: { "x-ratelimit-limit": "10", "x-ratelimit-remaining": "0" },
    body: { stat: "ok" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: a 429 reports down and echoes Retry-After", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    statusText: "Too Many Requests",
    headers: { "retry-after": "30" },
    body: "",
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.message, "rate limited; retry after 30s");
  assertEquals(report.quota?.[0]?.remaining, 0);
});

Deno.test("quota: missing rate-limit headers reports unknown, not a fabricated reading", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: { "content-type": "application/json" },
    body: { stat: "ok" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: a non-429 HTTP failure reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
