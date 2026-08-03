import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

const RESET = 1893456000; // 2030-01-01T00:00:00Z

const headers = (over: Record<string, string> = {}) => ({
  "content-type": "application/json",
  "x-ratelimit-limit": "3000",
  "x-ratelimit-remaining": "2500",
  "x-ratelimit-reset": String(RESET),
  "x-burstlimit-limit": "500",
  "x-burstlimit-remaining": "480",
  ...over,
});

Deno.test("quota: is a signed, per-connection quota check", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.covers, ["*"]);
  assertEquals(quota.unavailable, undefined);
  // Defaults for this kind: scope "connection", credential "signed".
  assertEquals(quota.scope, undefined);
  assertEquals(quota.credential, undefined);
});

Deno.test("quota: probes Accounts:get on the connection's own regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { accountName: "Example" }, headers: headers() }]);
  await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://na4.docusign.net/restapi/v2.1/accounts/acc-1");
  assertEquals(calls[0].method, "GET");
});

Deno.test("quota: reads both the hourly and the 30-second burst buckets", async () => {
  const { ctx } = mockCtx([{ body: {}, headers: headers() }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.quota, [
    {
      id: "hourly",
      unit: "requests",
      limit: 3000,
      remaining: 2500,
      resetAt: new Date(RESET * 1000).toISOString(),
    },
    { id: "burst-30s", unit: "requests", limit: 500, remaining: 480 },
  ]);
  assertEquals(report.message, "2500 of 3000 hourly requests left.");
});

Deno.test("quota: degrades below a tenth of the hourly allowance", async () => {
  const { ctx } = mockCtx([{ body: {}, headers: headers({ "x-ratelimit-remaining": "120" }) }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message, "Only 120 of 3000 hourly requests left.");
});

Deno.test("quota: an exhausted hourly bucket is down", async () => {
  const { ctx } = mockCtx([{ body: {}, headers: headers({ "x-ratelimit-remaining": "0" }) }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: a 429 is itself the answer", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: {},
    headers: headers({ "x-ratelimit-remaining": "0" }),
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.message?.includes("429"), true);
  assertEquals(report.quota?.[0].remaining, 0);
});

Deno.test("quota: reports unknown — not ok — when Docusign omits the headers", async () => {
  const { ctx } = mockCtx([{ body: {}, headers: { "content-type": "application/json" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.message?.includes("not present on every response"), true);
  assertEquals(report.quota, undefined);
});

Deno.test("quota: a burst-only response still reports the bucket it got", async () => {
  const { ctx } = mockCtx([{
    body: {},
    headers: { "x-burstlimit-limit": "200", "x-burstlimit-remaining": "199" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.quota, [{ id: "burst-30s", unit: "requests", limit: 200, remaining: 199 }]);
  // No hourly bucket to judge, so the state stays optimistic rather than invented.
  assertEquals(report.state, "ok");
});

Deno.test("quota: any other error status is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.message?.includes("500"), true);
});

Deno.test("quota: refuses to guess a URL when the connection was never resolved", async () => {
  const { ctx } = mockCtx([], { display: null });
  await assertRejects(() => Promise.resolve(quota.check!({}, ctx)));
});
