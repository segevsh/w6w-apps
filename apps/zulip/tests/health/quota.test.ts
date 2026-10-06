import { assert, assertEquals } from "@std/assert";
import quota, { headroom } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const h = (limit: string, remaining: string) => ({
  "content-type": "application/json",
  "x-ratelimit-limit": limit,
  "x-ratelimit-remaining": remaining,
});

Deno.test("quota: informational quota check, signed (no own allowlist)", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
});

Deno.test("headroom: ok / degraded under 20% / down at zero / unknown", () => {
  assertEquals(headroom(150, 200), "ok");
  assertEquals(headroom(30, 200), "degraded");
  assertEquals(headroom(0, 200), "down");
  assertEquals(headroom(undefined, 200), "unknown");
});

Deno.test("quota: reads X-RateLimit-* off GET /users/me", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success" }, headers: h("200", "199") }]);
  const r = await quota.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://acme.zulipchat.com/api/v1/users/me");
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [{ id: "user", limit: 200, remaining: 199, unit: "requests" }]);
});

Deno.test("quota: low headroom degrades; a 429 is down; a missing header or failure is unknown", async () => {
  const low = await quota.check!({} as never, mockCtx([{ body: {}, headers: h("200", "10") }]).ctx);
  assertEquals(low.state, "degraded");
  const hit = await quota.check!(
    {} as never,
    mockCtx([{ status: 429, body: {}, headers: h("200", "0") }]).ctx,
  );
  assertEquals(hit.state, "down");
  const none = await quota.check!({} as never, mockCtx([{ body: {} }]).ctx);
  assertEquals(none.state, "unknown");
  assert(none.message!.includes("X-RateLimit"));
  assertEquals(
    (await quota.check!({} as never, mockCtx([{ status: 401, body: {} }]).ctx)).state,
    "unknown",
  );
  assertEquals((await quota.check!({} as never, mockCtx([], null).ctx)).state, "unknown");
});
