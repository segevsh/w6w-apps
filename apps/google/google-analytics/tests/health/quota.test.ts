import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

const display = { propertyId: "123" };
const pq = (tokensPerDayRemaining: number, consumed = 10) => ({
  propertyQuota: {
    tokensPerDay: { consumed, remaining: tokensPerDayRemaining },
    tokensPerHour: { consumed, remaining: 39000 },
    concurrentRequests: { consumed: 1, remaining: 9 },
  },
});

Deno.test("quota: is informational and signed on the app's own egress", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  // A signed check must not widen the allowlist.
  assertEquals(quota.network, undefined);
  // The probe costs tokens, so it is rate-limited harder than the others.
  assertEquals(quota.minIntervalSeconds, 900);
});

Deno.test("quota: runs the cheapest possible report and reads propertyQuota off it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: pq(180000) }], { display });
  const result = await quota.check!({} as never, ctx) as {
    state: string;
    quota: Array<Record<string, unknown>>;
  };
  assertEquals(
    calls[0].url,
    "https://analyticsdata.googleapis.com/v1beta/properties/123:runReport",
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.limit, "1");
  assertEquals(sent.metrics, [{ name: "activeUsers" }]);
  assertEquals(sent.returnPropertyQuota, true);
  assertEquals(result.state, "ok");
  // GA4 reports remaining and consumed but never the ceiling, so the allowance
  // is reconstructed rather than invented.
  assertEquals(result.quota[0], {
    id: "tokensPerDay",
    limit: 180010,
    remaining: 180000,
    unit: "tokens",
  });
  assertEquals(result.quota[2].unit, "requests");
});

Deno.test("quota: under 10% of the day's tokens degrades, exhaustion is down", async () => {
  const low = mockCtx([{ status: 200, body: pq(500, 9500) }], { display });
  assertEquals((await quota.check!({} as never, low.ctx) as { state: string }).state, "degraded");
  const out = mockCtx([{ status: 200, body: pq(0, 200000) }], { display });
  assertEquals((await quota.check!({} as never, out.ctx) as { state: string }).state, "down");
});

Deno.test("quota: a report with no propertyQuota, or no property, is unknown", async () => {
  const bare = mockCtx([{ status: 200, body: { rows: [] } }], { display });
  const a = await quota.check!({} as never, bare.ctx) as { state: string; message: string };
  assertEquals(a.state, "unknown");
  assertEquals(a.message, "report carried no propertyQuota");

  const noProp = mockCtx([], { display: {} });
  const b = await quota.check!({} as never, noProp.ctx) as { state: string; message: string };
  assertEquals(b.state, "unknown");
  assertEquals(b.message, "connection records no property");
  assertEquals(noProp.calls.length, 0);
});

Deno.test("quota: a failed probe is unknown and names the status", async () => {
  const { ctx } = mockCtx([{ status: 429, body: "" }], { display });
  const result = await quota.check!({} as never, ctx) as { state: string; message: string };
  assertEquals(result.state, "unknown");
  assertEquals(result.message, "quota probe returned 429");
});
