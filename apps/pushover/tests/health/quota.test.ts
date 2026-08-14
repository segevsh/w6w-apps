import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { BASE_URL } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

const LIMITS_URL = `${BASE_URL}/1/apps/limits.json`;

/** `GET /1/apps/limits.json` as Pushover answers it. */
function limits(over: Record<string, unknown> = {}) {
  return { status: 1, limit: 10000, remaining: 7500, reset: 1788220800, request: "req-1", ...over };
}

/**
 * The allowance is per account, not per app, and the credential rides on the
 * connection — so this is a connection-scoped check reading the caller's own
 * budget rather than an app-wide one.
 */
Deno.test("quota: connection-scoped and credential-bearing", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "context");
  assertEquals(quota.covers, ["*"]);
  assertEquals(typeof quota.check, "function");
});

Deno.test("quota: reads the monthly allowance and reports headroom", async () => {
  const { ctx, calls } = mockCtx([{ body: limits() }]);
  const report = await quota.check!({}, ctx);

  assertEquals(calls[0].url, LIMITS_URL);
  assertEquals(calls[0].method, "GET");
  assertEquals(report.state, "ok");
  assert(report.message!.includes("7500/10000 messages left"), report.message);
  assert(report.message!.includes("resets at 2026-"), report.message);
});

/** Under a tenth of the month's messages left is worth flagging before it bites. */
Deno.test("quota: below 10% headroom is degraded", async () => {
  const { ctx } = mockCtx([{ body: limits({ remaining: 400 }) }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("400/10000"), report.message);
});

/**
 * Nothing can be sent until the allowance resets, so this is `down` — the one
 * state that says "this app cannot do its job right now".
 */
Deno.test("quota: an exhausted allowance is down, and says why", async () => {
  const { ctx } = mockCtx([{ body: limits({ remaining: 0 }) }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("no messages can be sent"), report.message);
});

/** A Team account's ceiling is different; the ratio, not a hardcoded number, decides. */
Deno.test("quota: headroom is judged against the account's own limit", async () => {
  const { ctx } = mockCtx([{ body: limits({ limit: 25000, remaining: 3000 }) }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(report.message!.includes("3000/25000"), report.message);
});

Deno.test("quota: an HTTP error is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { status: 0 } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("500"), report.message);
});

/** Pushover answers 200 with `status: 0` on a rejected request — a 2xx is not a yes. */
Deno.test("quota: a 200 carrying status 0 is unknown", async () => {
  const { ctx } = mockCtx([{ body: { status: 0, errors: ["application token is invalid"] } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("rejected"), report.message);
});

Deno.test("quota: a body with no remaining count is unknown", async () => {
  const { ctx } = mockCtx([{ body: { status: 1, limit: 10000 } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no remaining count"), report.message);
});

/** A missing `limit` leaves no ratio to judge, so headroom must not be invented. */
Deno.test("quota: without a limit it reports the count and stays ok", async () => {
  const { ctx } = mockCtx([{ body: { status: 1, remaining: 12 } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(report.message!.includes("12 messages left"), report.message);
  assert(!report.message!.includes("/"), report.message);
});
