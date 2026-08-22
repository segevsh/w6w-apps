import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

const withHeaders = (headers: Record<string, string>, status = 200) => ({
  status,
  headers: { "content-type": "application/json", ...headers },
  body: { code: "Success", data: {} },
});

/** Fivetran sends real rate-limit headers, so this is a genuine reading. */
Deno.test("quota: reports the remaining hourly allowance", async () => {
  const { ctx, calls } = mockCtx([
    withHeaders({ "x-rate-limit": "20000", "x-rate-limit-remaining": "19500" }),
  ]);
  const result = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.fivetran.com/v1/account/info");
  assertEquals(result.state, "ok");
  assertEquals(result.quota![0].limit, 20000);
  assertEquals(result.quota![0].remaining, 19500);
});

/** 500/hour is a trial, and saying so turns a number into a fact. */
Deno.test("quota: a trial-tier allowance is named as such", async () => {
  const { ctx } = mockCtx([
    withHeaders({ "x-rate-limit": "500", "x-rate-limit-remaining": "400" }),
  ]);
  const result = await quota.check!({}, ctx);
  assert(/trial-tier allowance/.test(result.message!), result.message);
});

Deno.test("quota: running low is degraded, and exhausted is down", async () => {
  const low = mockCtx([withHeaders({ "x-rate-limit": "20000", "x-rate-limit-remaining": "100" })]);
  assertEquals((await quota.check!({}, low.ctx)).state, "degraded");

  const gone = mockCtx([withHeaders({ "x-rate-limit": "20000", "x-rate-limit-remaining": "0" })]);
  assertEquals((await quota.check!({}, gone.ctx)).state, "down");
});

Deno.test("quota: a 429 is down and reports the retry", async () => {
  const { ctx } = mockCtx([withHeaders({ "retry-after": "120" }, 429)]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/120s/.test(result.message!), result.message);
});

/** Assuming a limit would be a confident wrong answer. */
Deno.test("quota: no rate-limit header is unknown rather than guessed", async () => {
  const { ctx } = mockCtx([withHeaders({})]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/no rate-limit header/.test(result.message!), result.message);
});

Deno.test("quota: a rejected credential is unknown", async () => {
  const { ctx } = mockCtx([withHeaders({}, 401)]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

/** Headroom is a capacity fact rather than an outage. */
Deno.test("quota: is informational and is a live probe, not a declared absence", () => {
  assertEquals(quota.severity, "informational");
  assert(quota.check, "quota should be a live probe");
  assertEquals(quota.unavailable, undefined);
});
