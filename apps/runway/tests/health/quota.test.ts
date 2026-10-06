import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const org = (balance: unknown, ceiling?: number) => ({
  body: { creditBalance: balance, tier: { maxMonthlyCreditSpend: ceiling, models: {} }, usage: {} },
});

Deno.test("quota: plenty of credits is ok and reports the reading", async () => {
  const { ctx, calls } = mockCtx([org(5000, 10000)]);
  const r = await quota.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [{ id: "credits", remaining: 5000, unit: "credits" }]);
  assertEquals(quota.credential, "signed");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/organization");
});

Deno.test("quota: under a tenth of the tier ceiling is degraded; zero is down", async () => {
  assertEquals((await quota.check!({}, mockCtx([org(999, 10000)]).ctx)).state, "degraded");
  assertEquals((await quota.check!({}, mockCtx([org(0, 10000)]).ctx)).state, "down");
});

Deno.test("quota: no ceiling is no alert; missing figures and errors are unknown", async () => {
  assertEquals((await quota.check!({}, mockCtx([org(3, 0)]).ctx)).state, "ok");
  assertEquals((await quota.check!({}, mockCtx([org(undefined)]).ctx)).state, "unknown");
  assertEquals((await quota.check!({}, mockCtx([{ status: 401, body: {} }]).ctx)).state, "unknown");
});
