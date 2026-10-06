import { assertEquals } from "@std/assert";
import quota, { CREDITS_URL } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: signed check on the app's own host, no widened egress", () => {
  assertEquals(CREDITS_URL, "https://api.seamless.ai/api/client/v2/credits");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: one reading per credit category, ok while any credit remains", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      success: true,
      data: {
        contacts: { remaining: 120, refreshesAt: "2026-11-01T00:00:00Z" },
        companies: { remaining: 4, refreshesAt: null },
      },
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(calls[0].url, CREDITS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [
    { id: "contacts", remaining: 120, unit: "credits", resetAt: "2026-11-01T00:00:00Z" },
    { id: "companies", remaining: 4, unit: "credits" },
  ]);
});

Deno.test("quota: an exhausted category is degraded and named, never down", async () => {
  const { ctx } = mockCtx([{
    body: { success: true, data: { contacts: { remaining: 0 }, companies: { remaining: 9 } } },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message, "Out of credits: contacts");
});

Deno.test("quota: a refusal or an unrecognisable body is unknown, not a verdict", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { msg: "Invalid token" } }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
  const { ctx: ctx2 } = mockCtx([{ body: { success: true, data: {} } }]);
  assertEquals((await quota.check!({}, ctx2)).state, "unknown");
  const { ctx: ctx3 } = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await quota.check!({}, ctx3)).state, "unknown");
});
