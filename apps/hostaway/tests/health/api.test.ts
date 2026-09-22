import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import api from "../../health/api.ts";

const URL_UNDER_TEST = "https://api.hostaway.com/v1/users?limit=1";

Deno.test("api: probes the documented users endpoint with the credential posture that signs it", async () => {
  assertEquals(api.key, "api");
  assertEquals(api.kind, "dependency");
  assertEquals(api.scope, "connection");
  assertEquals(api.credential, "signed");
  assertEquals(api.covers, ["*"]);

  const { ctx, calls } = mockCtx([{ body: { status: "success", result: [{ id: 1 }] } }]);
  const report = await api.check!({}, ctx);
  assertEquals(calls[0].url, URL_UNDER_TEST);
  assertEquals(calls[0].method, "GET");
  // The runtime's sign hook adds the header; this hook must never carry one itself.
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals(report.state, "ok");
});

Deno.test("api: classifies from the body's status field, not the HTTP status", async () => {
  // 200 + status "fail" is still a failure.
  const failing = mockCtx([{
    status: 200,
    body: { status: "fail", message: "Listing error: cancellationPolicy is invalid" },
  }]);
  const report = await api.check!({}, failing.ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("cancellationPolicy"));

  // 403 + status "success" must not be read as a failure of the API.
  const success = mockCtx([{ status: 403, body: { status: "success", result: [] } }]);
  const okReport = await api.check!({}, success.ctx);
  assertEquals(okReport.state, "ok");
});

Deno.test("api: reports the 429 rate-limit headers as a quota reading, retry-at as a timestamp", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { status: "fail", message: "You have exceeded the rate limits" },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "200",
      "x-ratelimit-remaining": "0",
      "x-ratelimit-retry-after": "1700000000",
      "x-ratelimit-applied": "account",
    },
  }]);
  const report = await api.check!({}, ctx);
  // The documented 429 body is a status "fail" envelope; the verdict is still degraded.
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("rate limits"));
  assertEquals(report.quota?.[0]?.limit, 200);
  assertEquals(report.quota?.[0]?.remaining, 0);
  assertEquals(report.quota?.[0]?.id, "account");
  assertEquals(report.quota?.[0]?.resetAt, new Date(1_700_000_000 * 1000).toISOString());
});

Deno.test("api: a 429 with no envelope still yields the documented quota reading", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: "Too many requests",
    headers: {
      "content-type": "text/plain",
      "x-ratelimit-limit": "200",
      "x-ratelimit-remaining": "0",
      "x-ratelimit-retry-after": "1700000000",
      "x-ratelimit-applied": "account",
    },
  }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "degraded");
  const [quota] = report.quota ?? [];
  assertEquals(quota?.id, "account");
  assertEquals(quota?.limit, 200);
  assertEquals(quota?.remaining, 0);
  // Documented as a Unix timestamp in SECONDS, not a delay.
  assertEquals(quota?.resetAt, new Date(1_700_000_000 * 1000).toISOString());
});

Deno.test("api: a 5xx without Hostaway's envelope is down", async () => {
  const { ctx } = mockCtx([{ status: 503, statusText: "Service Unavailable", body: "<html>502" }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message?.includes("503"));
});

Deno.test("api: an unreachable host is down, with the host named", async () => {
  const { ctx } = mockCtx([]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message?.includes("api.hostaway.com"));
});

Deno.test("api: an unrecognised non-envelope response is degraded, not ok", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("api: the report never carries credential material", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: "fail", message: "The resource owner or authorization server denied" },
  }]);
  const report = await api.check!({}, ctx);
  assert(!/bearer|token/i.test(report.message ?? ""), report.message);
});
