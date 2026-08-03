import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const RL = (limit: string, remaining: string) => ({
  "content-type": "application/json",
  "X-Fd-RateLimit-Limit": limit,
  "X-Fd-RateLimit-Remaining": remaining,
});

Deno.test("quota: is a signed, informational check with no extra egress", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  // api.flodesk.com is already the app's egress entry; a signed probe must not widen it.
  assertEquals(quota.network, undefined);
});

Deno.test("quota: probes the cheapest authenticated read, GET /v1/segments/colors", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: ["#B7D4C7"], headers: RL("100", "68") }]);
  await quota.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://api.flodesk.com/v1/segments/colors");
  assertEquals(calls[0].method, "GET");
});

Deno.test("quota: reports ok with the headroom read off the headers", async () => {
  const { ctx } = mockCtx([{ status: 200, body: ["#B7D4C7"], headers: RL("100", "68") }]);
  const out = await quota.check!({} as never, ctx);

  assertEquals(out.state, "ok");
  assertEquals(out.quota, [{ id: "default", limit: 100, remaining: 68, unit: "requests" }]);
});

Deno.test("quota: never invents a resetAt — Flodesk publishes no reset header", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [], headers: RL("100", "68") }]);
  const out = await quota.check!({} as never, ctx);
  assert(!("resetAt" in out.quota![0]) || out.quota![0].resetAt === undefined);
});

Deno.test("quota: degrades below 10% of the allowance", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [], headers: RL("100", "5") }]);
  assertEquals((await quota.check!({} as never, ctx)).state, "degraded");
});

Deno.test("quota: reports down at zero headroom", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [], headers: RL("100", "0") }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.state, "down");
  assertEquals(out.quota![0].remaining, 0);
});

Deno.test("quota: a 429 is down, and falls back to the documented 100/minute", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { message: "too many requests" } }]);
  const out = await quota.check!({} as never, ctx);

  assertEquals(out.state, "down");
  assert(out.message?.includes("429"));
  assertEquals(out.quota![0].limit, 100);
  assertEquals(out.quota![0].remaining, 0);
});

Deno.test("quota: reports unknown — not a guess — when the headers are absent", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [],
    headers: { "content-type": "application/json" },
  }]);
  const out = await quota.check!({} as never, ctx);

  assertEquals(out.state, "unknown");
  assert(out.message?.includes("X-Fd-RateLimit-Remaining"));
  assertEquals(out.quota, undefined, "must not fabricate a reading");
});

Deno.test("quota: reports unknown when the probe itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message?.includes("500"));
});
