import { assertEquals } from "@std/assert";
import quota, { readHeaders } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const json = { "content-type": "application/json" };
// deno-lint-ignore no-explicit-any
const check = quota.check as any;

Deno.test("quota: plenty of headroom is ok and reports the bucket", async () => {
  const { ctx, calls } = mockCtx([{
    body: {},
    headers: { ...json, "x-ratelimit-limit": "3600", "x-ratelimit-remaining": "3599" },
  }]);
  const out = await check({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota, [{
    id: "hourly-requests",
    limit: 3600,
    remaining: 3599,
    unit: "requests",
  }]);
  assertEquals(new URL(calls[0].url).pathname, "/v1/account");
});

Deno.test("quota: 90% consumed is degraded, zero remaining is down", async () => {
  const mk = (rem: string) =>
    mockCtx([{
      body: {},
      headers: { ...json, "x-ratelimit-limit": "3600", "x-ratelimit-remaining": rem },
    }]).ctx;
  assertEquals((await check({}, mk("360"))).state, "degraded");
  assertEquals((await check({}, mk("0"))).state, "down");
});

Deno.test("quota: missing headers are unknown, never ok", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals((await check({}, ctx)).state, "unknown");
});

Deno.test("quota: 429 is down, other failures unknown", async () => {
  assertEquals((await check({}, mockCtx([{ status: 429, body: {} }]).ctx)).state, "down");
  assertEquals((await check({}, mockCtx([{ status: 401, body: {} }]).ctx)).state, "unknown");
});

Deno.test("quota: readHeaders ignores blank and non-numeric values", () => {
  const h = new Headers({ "x-ratelimit-limit": "abc", "x-ratelimit-remaining": " " });
  assertEquals(readHeaders(h), { limit: undefined, remaining: undefined });
});
