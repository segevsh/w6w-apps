import { assert, assertEquals } from "@std/assert";
import { API, gqlOf, mockCtx } from "../_helpers.ts";
import quota, {
  parseMember,
  parseRateLimitHeaders,
  quotaState,
  splitMembers,
  windowLabel,
  WINDOWS,
} from "../../health/quota.ts";

/** Buffer's own documented example headers, verbatim from `guides/api-limits`. */
const RATELIMIT =
  '"200-in-15min";r=198;t=897, "1000-in-1day";r=998;t=86397, "30000-in-30days";r=29969;t=696980';
const POLICY =
  '"200-in-15min";q=200;w=900;pk=:ZjJjZjVmNzM5M2Zm:, "1000-in-1day";q=1000;w=86400;pk=:ZjJjZjVmNzM5M2Zm:, ' +
  '"30000-in-30days";q=30000;w=2592000;pk=:ZjJjZjVmNzM5M2Zm:';

const withHeaders = (headers: Record<string, string>, status = 200) => ({
  status,
  headers: { "content-type": "application/json", ...headers },
  body: { data: { account: { id: "a1" } } },
});

Deno.test("quota: posture — signed, informational, and no egress widening", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  // The spec forbids a signed check widening egress, and none is needed: the
  // probe stays on the app's only allowlisted host.
  assertEquals(quota.network, undefined);
});

Deno.test("quota: probes the API host with the same minimal, PII-free query", async () => {
  const { ctx, calls } = mockCtx([
    withHeaders({ ratelimit: RATELIMIT, "ratelimit-policy": POLICY }),
  ]);
  await quota.check!({}, ctx);
  assertEquals(calls[0].url, API);
  assertEquals(calls[0].method, "POST");
  const { query } = gqlOf(calls[0]);
  assert(/account\s*\{\s*id\s*\}/.test(query), query);
  assert(!/email/i.test(query), query);
});

Deno.test("quota: reports all three windows, not just one", async () => {
  const { ctx } = mockCtx([withHeaders({ ratelimit: RATELIMIT, "ratelimit-policy": POLICY })]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals((report.quota ?? []).map((q) => q.id), ["15m", "24h", "30d"]);
  assertEquals((report.quota ?? []).map((q) => q.remaining), [198, 998, 29969]);
  assertEquals((report.quota ?? []).map((q) => q.limit), [200, 1000, 30000]);
});

Deno.test("quota: the verdict is the WORST window — a burst limit hides behind a healthy month", async () => {
  const report = await run(
    '"200-in-15min";r=1;t=100, "30000-in-30days";r=29000;t=600000',
    '"200-in-15min";q=200;w=900, "30000-in-30days";q=30000;w=2592000',
  );
  // 1/200 is 0.5% — down. 29000/30000 is fine. Worst wins.
  assertEquals(report.state, "down");
});

Deno.test("quota: a nearly-spent monthly allowance degrades even with burst room left", async () => {
  const report = await run(
    '"200-in-15min";r=200;t=900, "30000-in-30days";r=2000;t=600000',
    '"200-in-15min";q=200;w=900, "30000-in-30days";q=30000;w=2592000',
  );
  // 2000/30000 = 6.7% — below the 15% degraded threshold.
  assertEquals(report.state, "degraded");
});

Deno.test("quota: resetAt is a real instant, because `t` is an explicit reset countdown", async () => {
  const report = await run('"a";r=10;t=900', '"a";q=100;w=900');
  const resetAt = report.quota?.[0]?.resetAt;
  assert(resetAt, "no resetAt");
  const delta = new Date(resetAt).getTime() - Date.now();
  assert(delta > 890_000 && delta < 910_000, `resetAt ${delta}ms away`);
});

Deno.test("quota: a 429 is a reading, not a failure — window and Retry-After both surface", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    headers: { "content-type": "application/json", "retry-after": "591" },
    body: {
      errors: [{
        message: "Too many requests from this client. Please try again later.",
        extensions: { code: "RATE_LIMIT_EXCEEDED", window: "15m" },
      }],
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(/`15m` window/.test(report.message ?? ""), report.message);
  assert(/retry after 591s/.test(report.message ?? ""), report.message);
  assertEquals(report.quota?.[0]?.remaining, 0);
});

Deno.test("quota: missing headers are unknown, never a fabricated ok", async () => {
  const { ctx } = mockCtx([withHeaders({})]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/no readable `RateLimit`/.test(report.message ?? ""), report.message);
});

Deno.test("quota: a failed probe is unknown, not down — that is the auth check's story", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: [{ message: "nope" }] } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/HTTP 401/.test(report.message ?? ""), report.message);
});

Deno.test("quota: headers on a non-2xx are still read, if they are there", async () => {
  // A 403 that nonetheless carried the limiter's headers is a real reading.
  const { ctx } = mockCtx([{
    status: 403,
    headers: {
      "content-type": "application/json",
      ratelimit: '"a";r=50;t=100',
      "ratelimit-policy": '"a";q=100;w=900',
    },
    body: { errors: [{ message: "nope" }] },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0]?.remaining, 50);
});

/* ---------------- parser units ---------------- */

Deno.test("splitMembers: splits on comma-then-quote, the way Buffer's own example does", () => {
  // A bare comma split would shred the `pk=:base64:` parameter.
  assertEquals(splitMembers(POLICY).length, 3);
  assert(splitMembers(POLICY)[0].includes("pk=:ZjJjZjVmNzM5M2Zm:"));
  assertEquals(splitMembers(null), []);
  assertEquals(splitMembers(""), []);
});

Deno.test("parseMember: reads the quoted name and the numeric params only", () => {
  assertEquals(parseMember('"200-in-15min";q=200;w=900;pk=:abc:'), {
    name: "200-in-15min",
    params: { q: 200, w: 900 },
  });
  // `pk` is a byte-sequence, not a number — deliberately skipped.
  assertEquals(parseMember("no-quotes;q=1"), undefined);
});

Deno.test("parseRateLimitHeaders: joins the two headers by their shared quoted name", () => {
  const rows = parseRateLimitHeaders(RATELIMIT, POLICY);
  assertEquals(rows.length, 3);
  assertEquals(rows[0], {
    name: "200-in-15min",
    limit: 200,
    window: 900,
    remaining: 198,
    resetSeconds: 897,
  });
});

Deno.test("parseRateLimitHeaders: a policy with no live reading is dropped", () => {
  // A ceiling with no consumption says nothing about headroom.
  assertEquals(parseRateLimitHeaders(null, POLICY), []);
});

Deno.test("parseRateLimitHeaders: a RateLimit with no matching policy still reports", () => {
  const rows = parseRateLimitHeaders('"x";r=5;t=10', null);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].remaining, 5);
  assertEquals(rows[0].limit, undefined);
});

Deno.test("windowLabel: matches on the window length, per Buffer's instruction", () => {
  // "Policy names ... change with your plan. Match a policy by its window
  // length (w) ... rather than by name."
  assertEquals(WINDOWS[900], "15m");
  assertEquals(WINDOWS[86400], "24h");
  assertEquals(WINDOWS[2592000], "30d");
  // A fourth window appearing is news, not noise — labelled, not dropped.
  assertEquals(windowLabel(3600), "3600s");
  assertEquals(windowLabel(undefined), "unknown window");
});

Deno.test("quotaState: thresholds", () => {
  assertEquals(quotaState(100, 100), "ok");
  assertEquals(quotaState(15, 100), "ok");
  assertEquals(quotaState(14, 100), "degraded");
  assertEquals(quotaState(2, 100), "down");
  assertEquals(quotaState(0, 100), "down");
  assertEquals(quotaState(1, 0), "unknown");
});

async function run(rateLimit: string, policy: string) {
  const { ctx } = mockCtx([withHeaders({ ratelimit: rateLimit, "ratelimit-policy": policy })]);
  return await quota.check!({}, ctx);
}
