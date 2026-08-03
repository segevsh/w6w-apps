import { assert, assertEquals } from "@std/assert";
import { mockCtx, mockQbCtx } from "../_helpers.ts";
import check, { headroom, resetAt } from "../../health/quota.ts";

Deno.test("quota: signed posture declares no extra egress", () => {
  assertEquals(check.kind, "quota");
  assertEquals(check.severity, "informational");
  // The spec forbids widening egress from a signed posture, and this probe
  // needs no widening — it stays on the app's own allowlist.
  assertEquals(check.network, undefined);
});

Deno.test("quota: probes the connection's app and reads x-ratelimit-* headers", async () => {
  const { ctx, calls } = mockQbCtx([{
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "100",
      "x-ratelimit-remaining": "87",
    },
    body: { id: "bqrapp1" },
  }]);
  const report = await check.check!({}, ctx);

  assertEquals(calls[0].url, "https://api.quickbase.com/v1/apps/bqrapp1");
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{
    id: "user-token",
    limit: 100,
    remaining: 87,
    resetAt: undefined,
    unit: "requests",
  }]);
});

Deno.test("quota: absent headers report unknown rather than a fabricated number", async () => {
  // Presence on a 200 could not be confirmed without a real credential, so the
  // check must degrade instead of assuming.
  const { ctx } = mockQbCtx([{ body: { id: "bqrapp1" } }]);
  const report = await check.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(report.message!.includes("x-ratelimit-*"));
  assertEquals(report.quota, undefined);
});

Deno.test("quota: exhausted allowance is down, nearly-exhausted is degraded", async () => {
  const spent = mockQbCtx([{
    headers: { "x-ratelimit-limit": "100", "x-ratelimit-remaining": "0" },
    body: {},
  }]);
  assertEquals((await check.check!({}, spent.ctx)).state, "down");

  const low = mockQbCtx([{
    headers: { "x-ratelimit-limit": "100", "x-ratelimit-remaining": "5" },
    body: {},
  }]);
  assertEquals((await check.check!({}, low.ctx)).state, "degraded");
});

Deno.test("quota: a failed probe is unknown, and says so without the credential", async () => {
  const { ctx } = mockQbCtx([{ status: 401, body: {} }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("401"));
});

Deno.test("quota: reports unknown when the connection records no app id", async () => {
  const { ctx, calls } = mockQbCtx([], { realm: "acme.quickbase.com" });
  const report = await check.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assertEquals(calls.length, 0);
});

Deno.test("quota: routes to the EU host for a .quickbase.eu realm", async () => {
  const { ctx, calls } = mockQbCtx(
    [{ headers: { "x-ratelimit-remaining": "50" }, body: {} }],
    { realm: "acme.quickbase.eu", appId: "bqrapp1" },
  );
  await check.check!({}, ctx);
  assertEquals(new URL(calls[0].url).host, "api.quickbase.eu");
});

Deno.test("quota: check works without a connection at all", async () => {
  const { ctx } = mockCtx([]);
  assertEquals((await check.check!({}, ctx)).state, "unknown");
});

Deno.test("headroom: grades remaining against the limit", () => {
  assertEquals(headroom(undefined, 100), "unknown");
  assertEquals(headroom(0, 100), "down");
  assertEquals(headroom(9, 100), "degraded");
  assertEquals(headroom(10, 100), "ok");
  // No limit to compare against — any positive remainder is fine.
  assertEquals(headroom(1, undefined), "ok");
});

Deno.test("resetAt: refuses the ambiguous small value rather than guessing its unit", () => {
  // The rate-limit window is 10 seconds, so "10000" is either 10 seconds
  // (milliseconds) or 2.8 hours (seconds). A 1000x-wrong timestamp is worse
  // than a blank field.
  assertEquals(resetAt("10000"), undefined);
  assertEquals(resetAt("10"), undefined);
  assertEquals(resetAt("0"), undefined);
});

Deno.test("resetAt: converts values that can only be an absolute epoch", () => {
  assertEquals(resetAt("1785787083"), new Date(1785787083 * 1000).toISOString());
  assertEquals(resetAt("1785787083000"), new Date(1785787083000).toISOString());
});

Deno.test("resetAt: parses an HTTP-date, and drops anything unparseable", () => {
  assertEquals(resetAt("Mon, 03 Aug 2026 16:02:21 GMT"), "2026-08-03T16:02:21.000Z");
  assertEquals(resetAt("soon"), undefined);
  assertEquals(resetAt(""), undefined);
  assertEquals(resetAt(null), undefined);
});
