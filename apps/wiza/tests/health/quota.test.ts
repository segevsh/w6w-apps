import { assertEquals } from "@std/assert";
import quota, { headroom } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const body = (api: unknown) => ({
  credits: { email_credits: "unlimited", phone_credits: 5, export_credits: 0, api_credits: api },
});

Deno.test("quota: signed, informational", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.severity, "informational");
});

Deno.test("headroom: 0 is down, under 10 degraded, otherwise ok", () => {
  assertEquals(headroom(0), "down");
  assertEquals(headroom(9), "degraded");
  assertEquals(headroom(10), "ok");
});

Deno.test("quota: reads api_credits only, ignoring the 'unlimited' string pools", async () => {
  const { ctx } = mockCtx([{ body: body(100) }]);
  const r = await quota.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [{ id: "api_credits", remaining: 100, unit: "credits" }]);
});

Deno.test("quota: exhausted credits are down; a missing balance is unknown; 429 degraded", async () => {
  assertEquals((await quota.check!({} as never, mockCtx([{ body: body(0) }]).ctx)).state, "down");
  assertEquals(
    (await quota.check!(
      {} as never,
      mockCtx([{ status: 401, body: { status: { code: 401 } } }]).ctx,
    )).state,
    "unknown",
  );
  assertEquals(
    (await quota.check!({} as never, mockCtx([{ status: 429, body: {} }]).ctx)).state,
    "degraded",
  );
});
