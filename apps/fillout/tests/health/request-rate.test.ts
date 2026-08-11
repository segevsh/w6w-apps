import { assert, assertEquals } from "@std/assert";
import requestRate, {
  DOCUMENTED_LIMIT,
  intHeader,
  QUOTA_ID,
  readRateHeaders,
  reportFromHeaders,
} from "../../health/request-rate.ts";
import plan from "../../health/plan.ts";
import { errorBody, EU_ROOT, mockCtx, US_ROOT } from "../_helpers.ts";

/** Exactly the header set `api.fillout.com` served on 2026-08-11. */
const LIVE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "ratelimit-limit": "5",
  "ratelimit-policy": "5;w=1",
  "ratelimit-remaining": "4",
  "ratelimit-reset": "1",
};

const NOW = Date.parse("2026-08-11T07:17:04.000Z");

Deno.test("request-rate: reads the un-prefixed IETF header names Fillout actually sends", () => {
  const rate = readRateHeaders(new Headers(LIVE_HEADERS));
  assertEquals(rate, {
    limit: 5,
    remaining: 4,
    resetSeconds: 1,
    policy: "5;w=1",
    retryAfterSeconds: undefined,
  });
  // The x-prefixed convention returns nothing here — asking for it is how a
  // quota check silently reports "unreadable" against a vendor that does
  // publish the numbers.
  assertEquals(intHeader(new Headers(LIVE_HEADERS), "x-ratelimit-limit"), undefined);
});

Deno.test("request-rate: a normal reading is ok and publishes the 5/second ceiling", () => {
  const report = reportFromHeaders(readRateHeaders(new Headers(LIVE_HEADERS)), 200, NOW);
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{
    id: QUOTA_ID,
    limit: 5,
    remaining: 4,
    unit: "requests",
    resetAt: "2026-08-11T07:17:05.000Z",
  }]);
  assert(/one-second window/.test(report.message ?? ""), report.message);
});

/**
 * The burst measured on 2026-08-11 walked `ratelimit-remaining` 4→3→2→1→0 and
 * then answered 429. Only the last two readings are actionable.
 */
Deno.test("request-rate: only an exhausted window degrades", () => {
  for (const remaining of [4, 3, 2, 1]) {
    const headers = new Headers({ ...LIVE_HEADERS, "ratelimit-remaining": String(remaining) });
    assertEquals(reportFromHeaders(readRateHeaders(headers), 200, NOW).state, "ok", `${remaining}`);
  }
  const empty = new Headers({ ...LIVE_HEADERS, "ratelimit-remaining": "0" });
  const report = reportFromHeaders(readRateHeaders(empty), 200, NOW);
  assertEquals(report.state, "degraded");
  assert(/throttling this API key/.test(report.message ?? ""), report.message);
});

Deno.test("request-rate: a 429 degrades and prefers retry-after for the reset", () => {
  const headers = new Headers({
    ...LIVE_HEADERS,
    "ratelimit-remaining": "0",
    "retry-after": "3",
  });
  const report = reportFromHeaders(readRateHeaders(headers), 429, NOW);
  assertEquals(report.state, "degraded");
  assertEquals(report.quota?.[0].resetAt, "2026-08-11T07:17:07.000Z");
});

/**
 * A vendor that stopped sending the headers would otherwise be reported as
 * having zero headroom. The documented ceiling is restated so the report still
 * carries the fact that matters.
 */
Deno.test("request-rate: missing headers are unknown, not exhausted", () => {
  const report = reportFromHeaders(readRateHeaders(new Headers()), 200, NOW);
  assertEquals(report.state, "unknown");
  assertEquals(report.quota, undefined);
  assert(report.message?.includes(`${DOCUMENTED_LIMIT} requests/second`), report.message);
});

Deno.test("request-rate: an unparseable header is treated as absent", () => {
  assertEquals(intHeader(new Headers({ "ratelimit-limit": "many" }), "ratelimit-limit"), undefined);
  const report = reportFromHeaders(
    readRateHeaders(new Headers({ "ratelimit-remaining": "3" })),
    200,
    NOW,
  );
  // The limit falls back to the documented ceiling rather than vanishing.
  assertEquals(report.quota?.[0].limit, DOCUMENTED_LIMIT);
});

// --- the live probe ---------------------------------------------------------

Deno.test("request-rate: probes /forms on the connection's own host, signed", async () => {
  const us = mockCtx([{ headers: LIVE_HEADERS, body: [] }]);
  assertEquals((await requestRate.check!({}, us.ctx)).state, "ok");
  assertEquals(us.calls[0].url, `${US_ROOT}/forms`);
  // Signed: the check must not stamp a credential itself.
  assertEquals(us.calls[0].headers.authorization, undefined);
  assertEquals(requestRate.credential, "signed");
  assertEquals(requestRate.network, undefined);

  const eu = mockCtx([{ headers: LIVE_HEADERS, body: [] }], { region: "eu" });
  await requestRate.check!({}, eu.ctx);
  assertEquals(eu.calls[0].url, `${EU_ROOT}/forms`);
});

/**
 * With the key rejected there is no account bucket, so whatever counter the
 * gateway reported is not this connection's. Reporting it would be a confident
 * number about the wrong thing — and whether the key is any good is the derived
 * `auth:api-key` check's job.
 */
Deno.test("request-rate: a credential failure is unknown, not a headroom reading", async () => {
  const mock = mockCtx([{
    status: 400,
    headers: LIVE_HEADERS,
    body: errorBody(400, "Bad Request", "API Key invalid"),
  }]);
  const report = await requestRate.check!({}, mock.ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.quota, undefined);
  assert(/auth:api-key/.test(report.message ?? ""), report.message);
});

Deno.test("request-rate: a 429 still yields a reading rather than being discarded", async () => {
  const mock = mockCtx([{
    status: 429,
    headers: { ...LIVE_HEADERS, "ratelimit-remaining": "0", "retry-after": "1" },
    body: errorBody(429, "Too Many Requests", "Too many requests. Try again soon."),
  }]);
  const report = await requestRate.check!({}, mock.ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.quota?.[0].remaining, 0);
});

Deno.test("request-rate: an unrelated failure is unknown and names the status", async () => {
  const mock = mockCtx([{
    status: 503,
    body: errorBody(503, "Service Unavailable", "upstream unavailable"),
  }]);
  const report = await requestRate.check!({}, mock.ctx);
  assertEquals(report.state, "unknown");
  assert(/503/.test(report.message ?? ""), report.message);
});

// --- the declared absence ---------------------------------------------------

/**
 * The two are deliberately separate checks: request rate IS readable and is
 * probed; plan allowance is not readable at all and is declared. Collapsing
 * them would let a healthy rate reading imply monthly headroom Fillout never
 * reported.
 */
Deno.test("plan: the monthly allowance is a declared absence, informational, with no hook", () => {
  assertEquals(plan.kind, "quota");
  assertEquals(plan.severity, "informational");
  assertEquals(plan.check, undefined);
  assert(plan.unavailable?.reason.includes("no account, usage, plan or billing endpoint"));
  assert(plan.key !== requestRate.key, "the two quota checks must not share a key");
});
