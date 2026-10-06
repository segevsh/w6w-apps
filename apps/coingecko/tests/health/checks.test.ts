import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

// deno-lint-ignore no-explicit-any
const svc = (feed: any) => (service.check as any)({ feed }, mockCtx().ctx);

Deno.test("service: declares the atom feed and is informational", () => {
  assertEquals(service.feed?.url, "https://status.coingecko.com/history.atom");
  assertEquals(service.severity, "informational");
});

Deno.test("service: no entries is ok; feed error is unknown", async () => {
  assertEquals((await svc({ latest: [] })).state, "ok");
  assertEquals((await svc({ error: "boom", latest: [] })).state, "unknown");
});

Deno.test("service: an unresolved incident is degraded, a resolved one is ignored", async () => {
  const open = await svc({
    latest: [{ title: "API latency", summary: "Status: Investigating" }, {
      title: "Old",
      summary: "Status: Resolved",
    }],
  });
  assertEquals(open.state, "degraded");
  assertEquals(open.message, "API latency");
});

Deno.test("quota: reads /key and reports remaining credits", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { plan: "Analyst", monthly_call_credit: 1000, current_remaining_monthly_calls: 800 },
  }]);
  const r = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.coingecko.com/api/v3/key");
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [{
    id: "monthly-call-credits",
    limit: 1000,
    remaining: 800,
    unit: "credits",
  }]);
});

Deno.test("quota: degraded at 90% used, down at zero", async () => {
  const lo = mockCtx([{
    status: 200,
    body: { monthly_call_credit: 1000, current_remaining_monthly_calls: 100 },
  }]);
  assertEquals((await quota.check!({}, lo.ctx)).state, "degraded");
  const none = mockCtx([{
    status: 200,
    body: { monthly_call_credit: 1000, current_remaining_monthly_calls: 0 },
  }]);
  assertEquals((await quota.check!({}, none.ctx)).state, "down");
});

Deno.test("quota: a refused /key (Demo plan) is unknown, not an outage", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { status: { error_code: 10005, error_message: "limited to PRO API subscribers" } },
  }]);
  const r = await quota.check!({}, ctx);
  assertEquals(r.state, "unknown");
  assert(r.message!.includes("10005"));
});

Deno.test("quota: a body with no credit figures is unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { plan: "x" } }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});
