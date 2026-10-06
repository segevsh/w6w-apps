import { assertEquals } from "@std/assert";
import { mockCtx, mockTalentLmsCtx } from "../_helpers.ts";
import check from "../../health/quota.ts";

Deno.test("quota: is an informational quota check that does not widen egress", () => {
  assertEquals(check.kind, "quota");
  assertEquals(check.severity, "informational");
  assertEquals(check.network, undefined);
});

Deno.test("quota: reads the rate-limit document", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{
    body: { limit: "2000", remaining: "1999", reset: "1374757895" },
  }]);
  const out = await check.check!({}, ctx);
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/ratelimit");
  assertEquals(out.state, "ok");
  assertEquals(out.quota, [{
    id: "hourly",
    limit: 2000,
    remaining: 1999,
    unit: "requests",
    resetAt: "2013-07-25T13:11:35.000Z",
  }]);
});

Deno.test("quota: degrades under 10% headroom and reports down at zero", async () => {
  const low = mockTalentLmsCtx([{ body: { limit: "2000", remaining: "150" } }]);
  assertEquals((await check.check!({}, low.ctx)).state, "degraded");
  const none = mockTalentLmsCtx([{ body: { limit: "2000", remaining: "0" } }]);
  assertEquals((await check.check!({}, none.ctx)).state, "down");
});

Deno.test("quota: unknown when the connection has no domain, the call fails, or the body is odd", async () => {
  const noDomain = mockCtx();
  assertEquals((await check.check!({}, noDomain.ctx)).state, "unknown");
  assertEquals(noDomain.calls.length, 0);
  const failed = mockTalentLmsCtx([{ status: 500, body: {} }]);
  assertEquals((await check.check!({}, failed.ctx)).state, "unknown");
  const odd = mockTalentLmsCtx([{ body: { limit: "2000" } }]);
  assertEquals((await check.check!({}, odd.ctx)).state, "unknown");
});
