import { assertEquals } from "@std/assert";
import check, { headroom } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const info = (remaining: number, used = 1) => ({
  error: false,
  response: {
    remaining_credits: remaining,
    used_credits: used,
    next_quota_renewal_date: "2026-10-18 20:52:28+00:00",
  },
});

Deno.test("quota: signed, informational, reports a credits bucket with limit and reset", async () => {
  assertEquals(check.credential, "signed");
  assertEquals(check.severity, "informational");
  const { ctx, calls } = mockCtx([{ body: info(99) }]);
  const r = await check.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, "https://api.prospeo.io/account-information");
  assertEquals(r.quota?.[0].id, "credits");
  assertEquals(r.quota?.[0].remaining, 99);
  assertEquals(r.quota?.[0].limit, 100);
  assertEquals(r.quota?.[0].resetAt, "2026-10-18T20:52:28.000Z");
});

Deno.test("quota: headroom thresholds", () => {
  assertEquals(headroom(0), "down");
  assertEquals(headroom(9), "degraded");
  assertEquals(headroom(10), "ok");
});

Deno.test("quota: 429 is degraded; a rejected key or odd body is unknown", async () => {
  assertEquals(
    (await check.check!({}, mockCtx([{ status: 429, body: "x" }]).ctx)).state,
    "degraded",
  );
  const bad = mockCtx([{ status: 400, body: { error: true, error_code: "INVALID_API_KEY" } }]);
  assertEquals((await check.check!({}, bad.ctx)).state, "unknown");
  assertEquals((await check.check!({}, mockCtx([{ body: "junk" }]).ctx)).state, "unknown");
});
