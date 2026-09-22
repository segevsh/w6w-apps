import { assertEquals } from "@std/assert";
import quota, { headroomState, parseHttpDate, PROBE_URL, readNumber } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const RATE_HEADERS = {
  "content-type": "application/json",
  // The vendor's own documented example values and header spelling.
  "ratelimit-limit": "1000",
  "ratelimit-remaining": "163",
  "ratelimit-reset": "Thu, 03 May 2018 16:00:00 GMT",
};

Deno.test("quota: declares a connection-scoped, signed, informational check", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.severity, "informational");
  // A signed check must not widen egress: `sign` routes it like any Action.
  assertEquals(quota.network, undefined);
  assertEquals(PROBE_URL, "https://api.gocardless.com/creditors?limit=1");
});

Deno.test("quota: reads the three headers off the probe and reports them as a bucket", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, headers: RATE_HEADERS, body: { creditors: [] } }]);
  const out = await quota.check!({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers["accept"], "application/json");
  // The credential is `sign`'s job, even for a health check.
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals(out.state, "ok");
  assertEquals(out.quota, [{
    id: "requests",
    limit: 1000,
    remaining: 163,
    resetAt: "2018-05-03T16:00:00.000Z",
    unit: "requests",
  }]);
});

Deno.test("quota: header lookup survives the vendor changing its mind about case", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: {
      "content-type": "application/json",
      "RateLimit-Limit": "1000",
      "RateLimit-Remaining": "0",
      "RateLimit-Reset": "Thu, 03 May 2018 16:00:00 GMT",
    },
    body: { creditors: [] },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.quota?.[0].remaining, 0);
});

Deno.test("quota: no headroom left is degraded — and the window will roll over", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: { ...RATE_HEADERS, "ratelimit-remaining": "0" },
    body: { creditors: [] },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "degraded");
  assertEquals(headroomState(0), "degraded");
  // Never `down`: an exhausted allowance is not an outage.
  assertEquals(headroomState(1), "ok");
  assertEquals(headroomState(undefined), "unknown");
});

/**
 * GoCardless sends these on error responses too, and a 401 that still reports
 * 998/1000 is the honest reading of "this credential's allowance". When they are
 * genuinely absent there is nothing to report, so the check says so instead of
 * guessing.
 */
Deno.test("quota: headers on an error response are still read", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { ...RATE_HEADERS, "ratelimit-remaining": "999" },
    body: { error: { type: "invalid_api_usage", code: 401, errors: [{ reason: "unauthorized" }] } },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota?.[0].remaining, 999);
});

Deno.test("quota: absent headers are unknown, with the status named", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: { type: "invalid_api_usage" } } }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
  assertEquals(
    out.message?.includes("401") === true || out.message?.includes("ratelimit") === true,
    true,
  );
  assertEquals(out.quota, undefined);
});

Deno.test("quota: an absent-header success is unknown, not ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { creditors: [] } }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
  assertEquals(out.message?.includes("ratelimit"), true, out.message);
});

Deno.test("quota: a missing limit or reset is left undefined rather than invented", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: { "content-type": "application/json", "ratelimit-remaining": "5" },
    body: { creditors: [] },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota, [{
    id: "requests",
    limit: undefined,
    remaining: 5,
    resetAt: undefined,
    unit: "requests",
  }]);
});

Deno.test("parseHttpDate: an HTTP-date becomes ISO 8601, nonsense becomes undefined", () => {
  assertEquals(parseHttpDate("Thu, 03 May 2018 16:00:00 GMT"), "2018-05-03T16:00:00.000Z");
  assertEquals(parseHttpDate(null), undefined);
  assertEquals(parseHttpDate(""), undefined);
  assertEquals(parseHttpDate("soon"), undefined);
});

Deno.test("readNumber: only a present, finite number is a reading", () => {
  assertEquals(readNumber("1000"), 1000);
  assertEquals(readNumber("0"), 0);
  assertEquals(readNumber(null), undefined);
  assertEquals(readNumber(""), undefined);
  assertEquals(readNumber("many"), undefined);
});
