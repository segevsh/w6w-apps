import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const run = (ctx: any) => quota.check!({} as any, ctx);
const usage = (remaining: number, minuteRemaining = 50) => ({
  credits: { total: 1000, used: 1000 - remaining, remaining },
  rateLimits: {
    daily: { limit: 5000, used: 10, remaining: 4990, resetsAt: "2026-10-07T00:00:00.000Z" },
    minute: { limit: 50, used: 0, remaining: minuteRemaining },
  },
});

Deno.test("quota: healthy headroom reports every dimension", async () => {
  const { ctx, calls } = mockCtx([{ body: usage(900) }]);
  const r = await run(ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota?.map((q) => q.id), ["credits", "daily-requests", "minute-requests"]);
  assertEquals(r.quota?.[1].resetAt, "2026-10-07T00:00:00.000Z");
  assertEquals(calls[0].url, "https://api.lusha.com/v3/account/usage");
});

Deno.test("quota: under 10% left or exhausted degrades and names the dimension", async () => {
  assertEquals((await run(mockCtx([{ body: usage(50) }]).ctx)).message, "credits low: 50/1000");
  const r = await run(mockCtx([{ body: usage(0) }]).ctx);
  assertEquals(r.state, "degraded");
  assertEquals(r.message, "credits exhausted");
});

Deno.test("quota: a refusal or an empty body is unknown, never ok", async () => {
  assertEquals((await run(mockCtx([{ status: 401, body: {} }]).ctx)).state, "unknown");
  assertEquals((await run(mockCtx([{ body: {} }]).ctx)).state, "unknown");
  assertEquals((await run(mockCtx([{ body: { credits: {} } }]).ctx)).state, "unknown");
});
