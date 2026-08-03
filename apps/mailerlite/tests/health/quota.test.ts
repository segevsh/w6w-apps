import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/quota.ts";

Deno.test("quota: is a signed, informational quota check with no extra egress", () => {
  assertEquals(check.key, "quota");
  assertEquals(check.kind, "quota");
  assertEquals(check.severity, "informational");
  assertEquals(check.network, undefined, "a signed check may not widen egress");
});

Deno.test("quota: probes the cheap subscriber-count endpoint", async () => {
  const { ctx, calls } = mockCtx([{
    body: { total: 10 },
    headers: { "x-ratelimit-limit": "120", "x-ratelimit-remaining": "119" },
  }]);
  await check.check!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "connect.mailerlite.com");
  assertEquals(url.pathname, "/api/subscribers");
  assertEquals(url.searchParams.get("limit"), "0");
});

Deno.test("quota: healthy headroom reports ok with the limit and remaining", async () => {
  const { ctx } = mockCtx([{
    body: { total: 10 },
    headers: { "x-ratelimit-limit": "120", "x-ratelimit-remaining": "119" },
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].limit, 120);
  assertEquals(report.quota?.[0].remaining, 119);
  assertEquals(report.quota?.[0].unit, "requests");
});

Deno.test("quota: under 10% headroom reports degraded", async () => {
  const { ctx } = mockCtx([{
    body: { total: 10 },
    headers: { "x-ratelimit-limit": "120", "x-ratelimit-remaining": "5" },
  }]);
  assertEquals((await check.check!({}, ctx)).state, "degraded");
});

Deno.test("quota: zero remaining on a 2xx reports down", async () => {
  const { ctx } = mockCtx([{
    body: { total: 10 },
    headers: { "x-ratelimit-limit": "120", "x-ratelimit-remaining": "0" },
  }]);
  assertEquals((await check.check!({}, ctx)).state, "down");
});

Deno.test("quota: a 429 reports down and turns Retry-After into an absolute resetAt", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: '{"message":"Too Many Attempts."}',
    headers: {
      "x-ratelimit-limit": "120",
      "x-ratelimit-remaining": "0",
      "retry-after": "119",
    },
  }]);
  const before = Date.now();
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.quota?.[0].remaining, 0);
  const resetAt = Date.parse(report.quota![0].resetAt!);
  assert(resetAt >= before + 119_000 - 2_000, "resetAt should be ~119s in the future");
  assert(resetAt <= Date.now() + 119_000 + 2_000);
});

Deno.test("quota: a response with no rate-limit headers reports unknown, not ok", async () => {
  const { ctx } = mockCtx([{ body: { total: 10 }, headers: {} }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert((report.message ?? "").includes("X-RateLimit"));
  assertEquals(report.quota, undefined, "must not invent a reading");
});

Deno.test("quota: a non-429 error reports unknown with the status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert((report.message ?? "").includes("500"));
});
