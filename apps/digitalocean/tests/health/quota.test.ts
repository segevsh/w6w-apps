import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

const withLimit = (remaining: number, limit = 5000) => ({
  status: 200,
  body: { account: {} },
  headers: {
    "content-type": "application/json",
    "ratelimit-limit": String(limit),
    "ratelimit-remaining": String(remaining),
    "ratelimit-reset": String(Math.floor(Date.now() / 1000) + 1800),
  },
});

/** One of the few APIs here that publishes a real account-wide budget. */
Deno.test("quota: reports how much of the hourly budget is left", async () => {
  const { ctx, calls } = mockCtx([withLimit(4987)]);
  const result = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.digitalocean.com/v2/account");
  assertEquals(result.state, "ok");
  assert(/4987 of 5000 requests left this hour/.test(result.message!), result.message);
  assert(/resetting in 30 min/.test(result.message!), result.message);
});

/** The reset is a timestamp; treating it as a delay gives fifty-five years. */
Deno.test("quota: converts the timestamp into a sensible delay", async () => {
  const { ctx } = mockCtx([withLimit(100)]);
  const result = await quota.check!({}, ctx);
  const minutes = Number(result.message!.match(/resetting in (\d+) min/)?.[1]);
  assert(minutes > 0 && minutes <= 31, `${minutes} minutes is not a plausible window`);
});

Deno.test("quota: running low is degraded and exhausted is down", async () => {
  const low = mockCtx([withLimit(200)]);
  const degraded = await quota.check!({}, low.ctx);
  assertEquals(degraded.state, "degraded");
  assert(/per TOKEN/.test(degraded.message!), degraded.message);

  const gone = mockCtx([withLimit(0)]);
  const down = await quota.check!({}, gone.ctx);
  assertEquals(down.state, "down");
  assert(/further requests are being refused/.test(down.message!), down.message);
});

/** Verified: a 401 carries no rate-limit headers at all. */
Deno.test("quota: a 401 is unknown, and says it reveals nothing about headroom", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { id: "unauthorized", message: "no" } }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/absent on a 401/.test(result.message!), result.message);
});

Deno.test("quota: a success without the headers is unknown, not zero", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { account: {} } }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/without rate-limit headers/.test(result.message!), result.message);
});

Deno.test("quota: an unreachable API is unknown", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof quota.check>>[1];
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

/** This one is genuinely checkable, unlike most of the pack's quota checks. */
Deno.test("quota: is a live signed check, not a declared absence", () => {
  assertEquals(typeof quota.check, "function");
  assertEquals(quota.unavailable, undefined);
  assertEquals(quota.credential, "signed");
  assert(/Unix TIMESTAMP rather than a delay/.test(quota.description!), quota.description);
});
