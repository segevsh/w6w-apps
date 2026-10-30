import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockWorkableCtx } from "../_helpers.ts";
import account from "../../health/account.ts";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";

// --- account (signed dependency) --------------------------------------------

test("account: is signed and connection-scoped, unlike this pack's usual unsigned probe", () => {
  assertEquals(account.kind, "dependency");
  assertEquals(account.scope, "connection");
  assertEquals(account.credential, "signed");
});

test("account: 200 means the token belongs to this subdomain", async () => {
  const { ctx } = mockWorkableCtx([{ status: 200, body: { id: "1" } }]);
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "ok");
});

test("account: 404 means the token and subdomain don't match — down, not unknown", async () => {
  const { ctx } = mockWorkableCtx([{ status: 404, body: { error: "Not found" } }]);
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("does not belong"));
});

test("account: 401 is a revoked/invalid token", async () => {
  const { ctx } = mockWorkableCtx([{ status: 401, body: {} }]);
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("invalid or was revoked"));
});

test("account: a connection with no subdomain is unknown, not down", async () => {
  const mock = mockWorkableCtx([]);
  (mock.ctx as { connection?: unknown }).connection = { display: {} };
  const report = await account.check!({}, mock.ctx);
  assertEquals(report.state, "unknown");
});

// --- quota -------------------------------------------------------------------

test("quota: reads the documented X-Rate-Limit-* headers", async () => {
  const { ctx } = mockWorkableCtx([{
    status: 200,
    body: { id: "1" },
    headers: {
      "content-type": "application/json",
      "x-rate-limit-limit": "10",
      "x-rate-limit-remaining": "7",
      "x-rate-limit-reset": "1893456000",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota![0].limit, 10);
  assertEquals(report.quota![0].remaining, 7);
  assertEquals(report.quota![0].resetAt, new Date(1893456000 * 1000).toISOString());
});

test("quota: no headroom left is down; low headroom is degraded", async () => {
  const zero = mockWorkableCtx([{
    body: {},
    headers: { "x-rate-limit-limit": "10", "x-rate-limit-remaining": "0" },
  }]);
  assertEquals((await quota.check!({}, zero.ctx)).state, "down");

  const low = mockWorkableCtx([{
    body: {},
    headers: { "x-rate-limit-limit": "100", "x-rate-limit-remaining": "5" },
  }]);
  assertEquals((await quota.check!({}, low.ctx)).state, "degraded");
});

test("quota: no rate-limit headers on the response is unknown", async () => {
  const { ctx } = mockWorkableCtx([{ body: {}, headers: { "content-type": "application/json" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("quota: severity is informational — it never worsens a roll-up", () => {
  assertEquals(quota.severity, "informational");
});

// --- service (Statuspage) -----------------------------------------------------

test("service: reports ok on 'All Systems Operational'", async () => {
  const { ctx } = mockWorkableCtx([{
    body: {
      status: { indicator: "none", description: "All Systems Operational" },
      components: [{ name: "Recruiting and applicant tracking", status: "operational" }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

test("service: the recruiting component's own state can outrank a clean page indicator", async () => {
  const { ctx } = mockWorkableCtx([{
    body: {
      status: { indicator: "none", description: "All Systems Operational" },
      components: [{ name: "Recruiting and applicant tracking", status: "major_outage" }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

test("service: a failed status API is unknown, never down", async () => {
  const { ctx } = mockWorkableCtx([{ status: 500, body: {} }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("service: is app-scoped and unsigned", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["workable.statuspage.io"]);
});
