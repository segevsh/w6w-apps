import { assert, assertEquals } from "@std/assert";
import quota, { PROBE_PATH, RATE_LIMIT_PER_WINDOW, WARN_FRACTION } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const ME = { user: { id: 1 }, company: { id: 2 }, scopes: ["customers:all"] };

function headers(limit: string, remaining: string, reset = "1770379510") {
  return {
    "ratelimit-limit": limit,
    "ratelimit-remaining": remaining,
    "ratelimit-reset": reset,
  };
}

Deno.test("quota: probes the same GET /me the credential check uses", () => {
  assertEquals(PROBE_PATH, "/me");
  assertEquals(RATE_LIMIT_PER_WINDOW, 25);
  assertEquals(quota.kind, "quota");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "signed");
});

Deno.test("quota: informational, so a five-second window can never pin the roll-up", () => {
  // An unreadable header reports `unknown`, and `unknown` outranks `ok`.
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: reads the ratelimit-* headers off a healthy /me call", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    headers: headers("25", "23"),
    body: ME,
  }]);
  const report = await quota.check!({}, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/me");
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{
    limit: 25,
    remaining: 23,
    unit: "requests",
    resetAt: new Date(1770379510 * 1000).toISOString(),
  }]);
});

Deno.test("quota: a nearly-spent window reports the reading and degrades", async () => {
  // 4/25 = 0.16, below the 0.2 warning fraction.
  assert(4 / 25 <= WARN_FRACTION);
  const { ctx } = mockCtx([{ status: 200, headers: headers("25", "4"), body: ME }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assertEquals(report.quota?.[0].remaining, 4);
  assert(report.message?.includes("4/25"), report.message);
});

Deno.test("quota: an exhausted window is down with the quota reading attached", async () => {
  const { ctx } = mockCtx([{ status: 200, headers: headers("25", "0"), body: ME }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "down");
  assertEquals(report.quota?.[0].remaining, 0);
});

Deno.test("quota: missing ratelimit headers are unknown, never an assumed zero", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: { "content-type": "application/json" },
    body: ME,
  }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assertEquals(report.quota, undefined);
  assert(report.message?.includes("ratelimit-limit"), report.message);
});

Deno.test("quota: an unparsable reset header drops resetAt instead of inventing a date", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: headers("25", "23", "not-a-timestamp"),
    body: ME,
  }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals("resetAt" in (report.quota?.[0] ?? {}), false);
});

Deno.test("quota: a rejected token is unknown, with the vendor's own error text", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "unauthorized", message: "Access token is missing or invalid" },
  }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(report.message?.includes("401"), report.message);
  assert(report.message?.includes("Access token is missing or invalid"), report.message);
});
