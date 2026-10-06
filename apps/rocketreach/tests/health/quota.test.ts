import { assertEquals } from "@std/assert";
import quota, { readPools } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const pool = (credit_type: string, allocated: unknown, used: number) => ({
  credit_type,
  allocated,
  used,
  remaining: typeof allocated === "number" ? allocated - used : allocated,
});

Deno.test("quota: healthy pools are ok and reported as readings; signed", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: 1, credit_usage: [pool("lookup", 100, 10), pool("export", 50, 0)] },
  }]);
  assertEquals(quota.credential, "signed");
  const res = await quota.check!({}, ctx);
  assertEquals(res.state, "ok");
  assertEquals(res.quota, [
    { id: "lookup", limit: 100, remaining: 90, unit: "credits" },
    { id: "export", limit: 50, remaining: 50, unit: "credits" },
  ]);
  assertEquals(calls[0].url, "https://api.rocketreach.co/api/v2/account/");
});

Deno.test("quota: one pool at 90% degrades; every finite pool exhausted is down", async () => {
  const warn = mockCtx([{
    body: { credit_usage: [pool("lookup", 100, 95), pool("phone", 10, 0)] },
  }]);
  const w = await quota.check!({}, warn.ctx);
  assertEquals(w.state, "degraded");
  assertEquals(w.message, "credits strained: lookup 95/100");
  const out = mockCtx([{
    body: { credit_usage: [pool("lookup", 100, 100), pool("phone", 10, 12)] },
  }]);
  assertEquals((await quota.check!({}, out.ctx)).state, "down");
  const one = mockCtx([{
    body: { credit_usage: [pool("lookup", 100, 100), pool("phone", 10, 1)] },
  }]);
  assertEquals((await quota.check!({}, one.ctx)).state, "degraded");
});

Deno.test("quota: 'inf' pools are skipped, the Universal object shape is read", async () => {
  assertEquals(readPools({ credit_usage: [pool("lookup", "inf", 5)] }), []);
  const uni = mockCtx([{
    body: { credit_usage: { credits_allocated: 1000, credits_used: 1000, credits_remaining: 0 } },
  }]);
  const res = await quota.check!({}, uni.ctx);
  assertEquals(res.state, "down");
  assertEquals(res.quota?.[0].id, "universal");
  const unlimited = mockCtx([{ body: { credit_usage: [pool("lookup", "inf", 5)] } }]);
  assertEquals((await quota.check!({}, unlimited.ctx)).state, "ok");
});

Deno.test("quota: a non-2xx is unknown", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "Invalid API key" } }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});
