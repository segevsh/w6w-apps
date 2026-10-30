import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { healthCredential, healthScope, healthSeverity } from "@w6w/types";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

// ------------------------------------------------------------------ service --

test("service: is declared absent rather than backed by a guessed probe", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assert(service.unavailable?.reason, "must record why no probe exists");
  assertEquals(service.check, undefined);
  // No status host is widened, because no probe reaches one.
  assertEquals(service.network, undefined);
  assertEquals(service.feed, undefined);
});

test("service: the reason names the surfaces that were ruled out", () => {
  const reason = service.unavailable!.reason;
  assert(reason.includes("ServiceHealth.Read.All"));
  assert(reason.includes("status.cloud.microsoft"));
  assert(reason.includes("status.office365.com"));
  assert(reason.includes("401"));
  assert(reason.includes("301"));
});

test("service: informational, so a permanent `unknown` cannot pin the verdict", () => {
  assertEquals(healthSeverity(service), "informational");
  assertEquals(healthScope(service), "app");
  assertEquals(healthCredential(service), "none");
});

// -------------------------------------------------------------------- quota --

test("quota: is a real probe, unlike the sibling outlook app's", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(typeof quota.check, "function");
  assertEquals(quota.unavailable, undefined);
});

test("quota: signed posture, so it declares no egress widening of its own", () => {
  assertEquals(healthCredential(quota), "signed");
  assertEquals(healthScope(quota), "connection");
  assertEquals(healthSeverity(quota), "informational");
  assertEquals(quota.network, undefined);
});

test("quota: probes the cheapest Files call, GET /me/drive", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1" } }]);
  await quota.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://graph.microsoft.com/v1.0/me/drive");
  assertEquals(calls[0].method, "GET");
});

test("quota: absent RateLimit headers report ok, not unknown", async () => {
  // SharePoint emits them only past 80% of the one-minute limit, so their
  // absence is the service saying there is headroom.
  const { ctx } = mockCtx([{ body: { id: "d1" } }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.state, "ok");
  assert(out.message?.includes("80%"), out.message);
  assertEquals(out.quota, undefined);
});

test("quota: reads RateLimit-* when SharePoint decorates the response", async () => {
  const { ctx } = mockCtx([{
    body: { id: "d1" },
    headers: {
      "content-type": "application/json",
      "ratelimit-limit": "1200",
      "ratelimit-remaining": "120",
      "ratelimit-reset": "5",
    },
  }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota?.[0].limit, 1200);
  assertEquals(out.quota?.[0].remaining, 120);
  assertEquals(out.quota?.[0].unit, "resource units");
  assert(out.quota?.[0].resetAt, "reset is a relative delta and must become an instant");
});

test("quota: degrades below a tenth of the window's allowance", async () => {
  const { ctx } = mockCtx([{
    body: {},
    headers: {
      "content-type": "application/json",
      "ratelimit-limit": "1200",
      "ratelimit-remaining": "50",
      "ratelimit-reset": "9",
    },
  }]);
  assertEquals((await quota.check!({} as never, ctx)).state, "degraded");
});

test("quota: an exhausted window is down", async () => {
  const { ctx } = mockCtx([{
    body: {},
    headers: {
      "content-type": "application/json",
      "ratelimit-limit": "1200",
      "ratelimit-remaining": "0",
    },
  }]);
  assertEquals((await quota.check!({} as never, ctx)).state, "down");
});

test("quota: a 429 answers the question rather than giving up on it", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: {},
    headers: { "content-type": "application/json", "retry-after": "31" },
  }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.state, "down");
  assert(out.message?.includes("31"), out.message);
});

test("quota: any other failure is unknown, not a verdict", async () => {
  const { ctx } = mockCtx([{ status: 503, body: {} }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message?.includes("503"), out.message);
});
