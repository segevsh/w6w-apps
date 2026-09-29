import { assertEquals } from "@std/assert";
import requestRate, {
  DOCUMENTED_LIMIT,
  intHeader,
  readRateHeaders,
  reportFromHeaders,
} from "../../health/request-rate.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("intHeader: parses a present integer header, undefined when absent or garbage", () => {
  const h = new Headers({ "x-ratelimit-limit": "60", "x-ratelimit-remaining": "not-a-number" });
  assertEquals(intHeader(h, "x-ratelimit-limit"), 60);
  assertEquals(intHeader(h, "x-ratelimit-remaining"), undefined);
  assertEquals(intHeader(h, "x-ratelimit-reset"), undefined);
});

Deno.test("readRateHeaders: reads the X-RateLimit-* set", () => {
  const h = new Headers({
    "x-ratelimit-limit": "60",
    "x-ratelimit-remaining": "59",
    "x-ratelimit-reset": "1790685126",
    "retry-after": "6",
  });
  assertEquals(readRateHeaders(h), {
    limit: 60,
    remaining: 59,
    resetUnix: 1790685126,
    retryAfterSeconds: 6,
  });
});

Deno.test("reportFromHeaders: unknown when no rate headers are present at all", () => {
  const out = reportFromHeaders({}, 200);
  assertEquals(out.state, "unknown");
  assertEquals(out.message?.includes(String(DOCUMENTED_LIMIT)), true);
});

Deno.test("reportFromHeaders: ok with headroom remaining", () => {
  const out = reportFromHeaders({ limit: 60, remaining: 59 }, 200);
  assertEquals(out.state, "ok");
  assertEquals(out.quota?.[0].remaining, 59);
  assertEquals(out.quota?.[0].limit, 60);
});

Deno.test("reportFromHeaders: degraded at zero remaining, with resetAt from the unix timestamp", () => {
  const out = reportFromHeaders({ limit: 60, remaining: 0, resetUnix: 1790685126 }, 429);
  assertEquals(out.state, "degraded");
  assertEquals(out.quota?.[0].resetAt, new Date(1790685126 * 1000).toISOString());
});

Deno.test("request-rate: probes GET /v1/forms?limit=1, signed", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    headers: { "x-ratelimit-limit": "60", "x-ratelimit-remaining": "58" },
  }]);
  const out = await requestRate.check!({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/forms");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(out.state, "ok");
});

Deno.test("request-rate: unknown, not degraded, when the credential is rejected", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("Could not authenticate", "authentication"),
  }]);
  const out = await requestRate.check!({}, ctx);
  assertEquals(out.state, "unknown");
  assertEquals(out.message?.includes("auth:api-key"), true);
});

Deno.test("request-rate: declares kind quota, scope connection, signed credential", () => {
  assertEquals(requestRate.kind, "quota");
  assertEquals(requestRate.scope, "connection");
  assertEquals(requestRate.credential, "signed");
});
