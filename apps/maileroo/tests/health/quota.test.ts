import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const usage = (hourly: [number, number], monthly: [number, number]) => ({
  data: {
    usage: [
      {
        name: "Hourly Outbound Usage",
        quantity: hourly[0],
        used: hourly[1],
        available: hourly[0] - hourly[1],
      },
      {
        name: "Monthly Outbound Usage",
        quantity: monthly[0],
        used: monthly[1],
        available: monthly[0] - monthly[1],
      },
      { name: "Monthly Inbound Usage", quantity: 10, used: 10, available: 0 },
    ],
  },
});

Deno.test("quota: ok with headroom, reporting the two outbound entries only", async () => {
  const { ctx, calls } = mockCtx([{ body: usage([1000, 42], [100000, 5000]) }]);
  const res = await quota.check!({}, ctx);
  assertEquals(res.state, "ok");
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/account");
  assertEquals(res.quota?.map((q) => q.id), ["outbound-hourly", "outbound-monthly"]);
  assertEquals(res.quota?.[1].remaining, 95000);
});

Deno.test("quota: degraded at 90% used, down when a limit is exhausted, unlimited is ok", async () => {
  const warn = mockCtx([{ body: usage([1000, 950], [100000, 5000]) }]);
  assertEquals((await quota.check!({}, warn.ctx)).state, "degraded");
  const out = mockCtx([{ body: usage([1000, 1], [100000, 100000]) }]);
  assertEquals((await quota.check!({}, out.ctx)).state, "down");
  const free = mockCtx([{ body: usage([-1, 5], [-1, 5]) }]);
  const res = await quota.check!({}, free.ctx);
  assertEquals(res.state, "ok");
  assertEquals(res.quota?.length, 0);
});

Deno.test("quota: a 403 (no account.read), other failures and missing usage are unknown", async () => {
  const noScope = mockCtx([{ status: 403, body: { error: { message: "scope" } } }]);
  assertEquals((await quota.check!({}, noScope.ctx)).state, "unknown");
  const bad = mockCtx([{ status: 500, body: "x" }]);
  assertEquals((await quota.check!({}, bad.ctx)).state, "unknown");
  const empty = mockCtx([{ body: { data: {} } }]);
  assertEquals((await quota.check!({}, empty.ctx)).state, "unknown");
});
