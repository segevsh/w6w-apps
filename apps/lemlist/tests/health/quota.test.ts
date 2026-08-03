import { assert, assertEquals } from "@std/assert";
import quota, { headroom, parseResetAt } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const CREDITS = { credits: 100, details: { remaining: { total: 100, paid: 10 } } };

Deno.test("quota: signed connection-scoped check that declares no egress of its own", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  // A signed check must stay on the app's own allowlist; declaring network.allow
  // alongside a signed posture is forbidden by the spec.
  assertEquals(quota.network, undefined);
});

Deno.test("quota: probes GET /team/credits on the app's own host", async () => {
  const { ctx, calls } = mockCtx([{ body: CREDITS }]);
  await quota.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://api.lemlist.com/api/team/credits");
});

Deno.test("quota: reports credits and rate-limit headroom as two buckets from one call", async () => {
  const { ctx, calls } = mockCtx([{
    body: CREDITS,
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "20",
      "x-ratelimit-remaining": "7",
      "x-ratelimit-reset": "Tue Feb 16 2021 09:02:42 GMT+0100",
    },
  }]);
  const out = await quota.check!({} as never, ctx);

  assertEquals(calls.length, 1, "one request must answer both questions");
  assertEquals(out.state, "ok");
  assertEquals(out.quota?.length, 2);

  const credits = out.quota?.find((q) => q.id === "credits");
  assertEquals(credits?.remaining, 100);
  assertEquals(credits?.unit, "credits");
  // A team buys credits rather than holding a fixed allowance, so no ceiling is
  // invented.
  assertEquals(credits?.limit, undefined);

  const requests = out.quota?.find((q) => q.id === "requests");
  assertEquals(requests?.limit, 20);
  assertEquals(requests?.remaining, 7);
  assertEquals(requests?.unit, "requests");
  assertEquals(requests?.resetAt, new Date("Tue Feb 16 2021 09:02:42 GMT+0100").toISOString());
});

Deno.test("quota: reports the rate-limit bucket unknown when the headers are absent", async () => {
  // The headers are documented but were not confirmed on the wire, so their
  // absence must degrade gracefully rather than fabricate a number.
  const { ctx } = mockCtx([{ body: CREDITS }]);
  const out = await quota.check!({} as never, ctx);

  assertEquals(out.state, "unknown");
  assertEquals(out.quota?.length, 1, "only the credits bucket survives");
  assertEquals(out.quota?.[0].id, "credits");
  assert(out.message?.includes("X-RateLimit-*"));
});

Deno.test("quota: falls back to the flat `credits` field when details.remaining is absent", async () => {
  const { ctx } = mockCtx([{ body: { credits: 42 } }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.quota?.find((q) => q.id === "credits")?.remaining, 42);
});

Deno.test("quota: zero credits reports down for that bucket", async () => {
  const { ctx } = mockCtx([{
    body: { credits: 0, details: { remaining: { total: 0 } } },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "20",
      "x-ratelimit-remaining": "20",
    },
  }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.state, "down");
  assertEquals(out.quota?.find((q) => q.id === "credits")?.remaining, 0);
});

Deno.test("quota: a body with neither credits shape reports unknown and says so", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message?.includes("credits"));
});

Deno.test("quota: a failing probe reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message?.includes("500"));
});

Deno.test("headroom: unknown without a reading, down at zero, degraded under 10%", () => {
  assertEquals(headroom(undefined, 20), "unknown");
  assertEquals(headroom(0, 20), "down");
  assertEquals(headroom(1, 20), "degraded");
  assertEquals(headroom(2, 20), "ok");
  assertEquals(headroom(20, 20), "ok");
  // No limit to compare against — any positive remaining is ok.
  assertEquals(headroom(1), "ok");
});

Deno.test("parseResetAt: reads lemlist's DOCUMENTED date-string form", () => {
  // lemlist's own example value. Most APIs send seconds-from-now here, so
  // treating this as a delta would produce a nonsense timestamp.
  const raw = "Tue Feb 16 2021 09:02:42 GMT+0100 (Central European Standard Time)";
  assertEquals(parseResetAt(raw), new Date(raw).toISOString());
  assert(parseResetAt(raw)!.startsWith("2021-02-16"));
});

Deno.test("parseResetAt: reads an ISO 8601 instant", () => {
  assertEquals(parseResetAt("2026-05-11T00:00:00.000Z"), "2026-05-11T00:00:00.000Z");
});

Deno.test("parseResetAt: treats a large bare number as epoch seconds, a small one as a delta", () => {
  assertEquals(parseResetAt("1715385600"), new Date(1715385600 * 1000).toISOString());

  const before = Date.now();
  const out = Date.parse(parseResetAt("2")!);
  assert(out >= before + 2000 && out <= Date.now() + 2000, "small values are seconds from now");
});

Deno.test("parseResetAt: returns undefined for absent or unusable values", () => {
  assertEquals(parseResetAt(null), undefined);
  assertEquals(parseResetAt(""), undefined);
  assertEquals(parseResetAt("not-a-date"), undefined);
});
