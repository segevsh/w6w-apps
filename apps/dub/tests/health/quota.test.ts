import { assertEquals } from "@std/assert";
import check, { headroom } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const H = (limit: string, remaining: string, reset: string) => ({
  "content-type": "application/json",
  "x-ratelimit-limit": limit,
  "x-ratelimit-remaining": remaining,
  "x-ratelimit-reset": reset,
});

Deno.test("quota: signed, connection-scoped and informational", () => {
  assertEquals([check.kind, check.scope, check.credential, check.severity], [
    "quota",
    "connection",
    "signed",
    "informational",
  ]);
});

Deno.test("quota: reads the headers, converting the epoch-seconds reset to ISO", async () => {
  const { ctx, calls } = mockCtx([{ body: [], headers: H("600", "590", "1790000000") }]);
  const report = await check.check!({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("pageSize"), "1");
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{
    id: "requests",
    limit: 600,
    remaining: 590,
    resetAt: new Date(1790000000 * 1000).toISOString(),
    unit: "requests",
  }]);
});

Deno.test("quota: under 10% left is degraded; none left is down", async () => {
  const low = mockCtx([{ body: [], headers: H("600", "30", "1790000000") }]);
  assertEquals((await check.check!({}, low.ctx)).state, "degraded");
  const none = mockCtx([{ body: [], headers: H("600", "0", "1790000000") }]);
  assertEquals((await check.check!({}, none.ctx)).state, "down");
  assertEquals([headroom(0, 60), headroom(5, 60), headroom(6, 60), headroom(50, 0)], [
    "down",
    "degraded",
    "ok",
    "ok",
  ]);
});

Deno.test("quota: a 429 is down and uses Retry-After when there is no reset header", async () => {
  const { ctx } = mockCtx([{ status: 429, body: {}, headers: { "retry-after": "30" } }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.quota![0].remaining, 0);
  assertEquals(typeof report.quota![0].resetAt, "string");
});

Deno.test("quota: missing headers are unknown, never an invented count", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.quota, undefined);
});

Deno.test("quota: a failed probe is unknown", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  assertEquals((await check.check!({}, ctx)).state, "unknown");
});
