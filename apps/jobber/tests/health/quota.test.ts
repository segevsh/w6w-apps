import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/quota.ts";

const cost = (currentlyAvailable: number, maximumAvailable = 10000, restoreRate = 500) => ({
  data: { account: { id: "a1" } },
  extensions: {
    cost: {
      requestedQueryCost: 1,
      actualQueryCost: 1,
      throttleStatus: { maximumAvailable, currentlyAvailable, restoreRate },
    },
  },
});

Deno.test("quota: informational, signed, and declares no extra egress", () => {
  assertEquals(check.kind, "quota");
  assertEquals(check.severity, "informational");
  // Defaults for this kind — scope: connection, credential: signed. A signed
  // probe may not widen the allowlist.
  assertEquals(check.network, undefined);
});

Deno.test("quota: probes the API endpoint with the pinned version header, unsigned by hand", async () => {
  const { ctx, calls } = mockCtx([{ body: cost(9953) }]);
  await check.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.getjobber.com/api/graphql");
  assertEquals(calls[0].headers["x-jobber-graphql-version"], "2025-04-16");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!).query, "{ account { id } }");
});

Deno.test("quota: reads the leaky bucket off extensions.cost.throttleStatus", async () => {
  const { ctx } = mockCtx([{ body: cost(9953) }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{
    id: "query-cost",
    limit: 10000,
    remaining: 9953,
    resetAt: report.quota![0].resetAt,
    unit: "points",
  }]);
});

Deno.test("quota: resetAt projects when the bucket refills at the advertised rate", async () => {
  const { ctx } = mockCtx([{ body: cost(9000, 10000, 500) }]);
  const before = Date.now();
  const report = await check.check!({}, ctx);
  const resetAt = new Date(report.quota![0].resetAt!).getTime();
  // (10000 - 9000) / 500 = 2 seconds.
  assert(
    resetAt - before >= 1500 && resetAt - before <= 3500,
    `resetAt was ${resetAt - before}ms out`,
  );
});

Deno.test("quota: a full bucket has no reset instant", async () => {
  const { ctx } = mockCtx([{ body: cost(10000) }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.quota![0].resetAt, undefined);
});

Deno.test("quota: below a tenth of the ceiling is degraded, empty is down", async () => {
  const low = mockCtx([{ body: cost(500) }]);
  assertEquals((await check.check!({}, low.ctx)).state, "degraded");

  const empty = mockCtx([{ body: cost(0) }]);
  assertEquals((await check.check!({}, empty.ctx)).state, "down");
});

Deno.test("quota: a THROTTLED probe still reports the reading it came back with", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      errors: [{ message: "Throttled", extensions: { code: "THROTTLED" } }],
      extensions: {
        cost: {
          requestedQueryCost: 10001,
          actualQueryCost: 0,
          throttleStatus: { maximumAvailable: 10000, currentlyAvailable: 120, restoreRate: 500 },
        },
      },
    },
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.quota![0].remaining, 120);
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("throttled"));
});

Deno.test("quota: a response with no cost block is unknown, not a fabricated bucket", async () => {
  const { ctx } = mockCtx([{ body: { data: { account: { id: "a1" } } } }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.quota, undefined);
  assert(report.message!.includes("extensions.cost.throttleStatus"));
});

Deno.test("quota: a rejected probe is unknown, not down", async () => {
  const { ctx } = mockCtx([{
    body: { errors: [{ message: "hidden because you are unauthenticated" }] },
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("unauthenticated"));
});

Deno.test("quota: an HTTP failure with no cost block is unknown", async () => {
  const { ctx } = mockCtx([{ status: 502, body: {} }]);
  assertEquals((await check.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: does not report the 2500-requests-per-5-minutes limiter it cannot read", async () => {
  const { ctx } = mockCtx([{ body: cost(9953) }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.quota!.length, 1);
  assertEquals(report.quota![0].id, "query-cost");
});
