import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const headers = (limit: string, remaining: string, reset?: string) => ({
  "content-type": "application/json",
  "x-ratelimit-limit": limit,
  "x-ratelimit-remaining": remaining,
  ...(reset ? { "x-ratelimit-reset": reset } : {}),
});

Deno.test("quota: signed, on the app's own host, no extra egress", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.network, undefined);
  assertEquals(quota.credential, undefined); // kind=quota defaults to signed
});

Deno.test("quota: plenty left reports ok with a reading", async () => {
  const { ctx, calls } = mockCtx([{ headers: headers("10000", "9500"), body: { data: [] } }]);
  const report = await quota.check!({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/users");
  assertEquals(calls[0].headers["authorization"], undefined); // sign adds it
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [
    { id: "hourly-requests", limit: 10000, remaining: 9500, unit: "requests" },
  ]);
});

Deno.test("quota: at or under 10% remaining reports degraded", async () => {
  const { ctx } = mockCtx([{ headers: headers("10000", "1000"), body: { data: [] } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message, "1000 of 10000 requests left this hour.");
});

Deno.test("quota: zero remaining is degraded, not ok", async () => {
  const { ctx } = mockCtx([{ headers: headers("10000", "0"), body: { data: [] } }]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

Deno.test("quota: a parseable reset header becomes resetAt, an unparseable one is dropped", async () => {
  const a = mockCtx([{ headers: headers("10000", "5000", "2026-10-06T19:00:00Z"), body: {} }]);
  assertEquals((await quota.check!({}, a.ctx)).quota?.[0].resetAt, "2026-10-06T19:00:00.000Z");
  const b = mockCtx([{ headers: headers("10000", "5000", "soon"), body: {} }]);
  assertEquals((await quota.check!({}, b.ctx)).quota?.[0].resetAt, undefined);
});

Deno.test("quota: a 403 scope refusal still carries headers and is judged on them", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    headers: headers("10000", "9000"),
    body: { errors: [{ id: "unauthorizedOauthScope" }] },
  }]);
  assertEquals((await quota.check!({}, ctx)).state, "ok");
});

Deno.test("quota: 429 is degraded", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { errors: [{ id: "rateLimitExceeded" }] } }]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

Deno.test("quota: a rejected credential is unknown (the auth check owns that verdict)", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Invalid JWT token." } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.message?.includes("auth check"), true);
});

Deno.test("quota: no rate-limit headers is unknown, never ok", async () => {
  const { ctx } = mockCtx([{ body: { data: [] } }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: nonsense header values are unknown", async () => {
  const { ctx } = mockCtx([{ headers: headers("abc", "5"), body: {} }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});
