import { assert, assertEquals } from "@std/assert";
import { mockCtx, page } from "../_helpers.ts";
import quota from "../../health/quota.ts";

/** A `/meetings` response carrying Fathom's documented rate-limit headers. */
const withLimits = (headers: Record<string, string>, status = 200) => ({
  status,
  body: status === 200 ? page([]) : "",
  headers: { "content-type": "application/json", ...headers },
});

Deno.test("quota: is informational and declares no extra egress (it is signed)", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: probes GET /meetings with no include flags", async () => {
  const { ctx, calls } = mockCtx([
    withLimits({ "RateLimit-Limit": "60", "RateLimit-Remaining": "42", "RateLimit-Reset": "17" }),
  ]);
  const report = await quota.check!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/external/v1/meetings");
  assertEquals(url.search, "");
  assertEquals(calls[0].method, "GET");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].id, "global");
  assertEquals(report.quota?.[0].limit, 60);
  assertEquals(report.quota?.[0].remaining, 42);
  assertEquals(report.quota?.[0].unit, "requests");
  // `RateLimit-Reset` is seconds remaining, turned into an absolute instant.
  assert(report.quota?.[0].resetAt);
  assert(new Date(report.quota![0].resetAt!).getTime() > Date.now());
});

Deno.test("quota: under 10% headroom degrades", async () => {
  const { ctx } = mockCtx([
    withLimits({ "RateLimit-Limit": "60", "RateLimit-Remaining": "5" }),
  ]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

Deno.test("quota: a spent window reports down", async () => {
  const { ctx } = mockCtx([
    withLimits({ "RateLimit-Limit": "60", "RateLimit-Remaining": "0" }),
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.quota?.[0].remaining, 0);
});

Deno.test("quota: reports remaining without a limit when RateLimit-Limit is absent", async () => {
  const { ctx } = mockCtx([withLimits({ "RateLimit-Remaining": "12" })]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].limit, undefined);
  assertEquals(report.quota?.[0].remaining, 12);
});

Deno.test("quota: a response without the headers reports unknown, not a guess", async () => {
  const { ctx } = mockCtx([withLimits({})]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.message, "response carried no `RateLimit-Remaining` header");
});

Deno.test("quota: a 429 reports down and surfaces Retry-After", async () => {
  const { ctx } = mockCtx([
    withLimits({ "RateLimit-Limit": "60", "Retry-After": "30" }, 429),
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message?.includes("30s"));
  assertEquals(report.quota?.[0].remaining, 0);
  assert(report.quota?.[0].resetAt);
});

Deno.test("quota: a 429 without Retry-After still reports down", async () => {
  const { ctx } = mockCtx([withLimits({}, 429)]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.quota?.[0].resetAt, undefined);
});

Deno.test("quota: any other failure reports unknown", async () => {
  const { ctx } = mockCtx([withLimits({}, 401)]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("401"));
});
