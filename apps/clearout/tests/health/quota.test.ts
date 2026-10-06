import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const credits = (remaining: unknown, threshold?: number) => ({
  body: {
    status: "success",
    data: { total_remaining_credits: remaining, low_credit_balance_min_threshold: threshold },
  },
});

Deno.test("quota: plenty of credits is ok and reports the reading", async () => {
  const { ctx, calls } = mockCtx([credits(5000, 100)]);
  const r = await quota.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [{ id: "credits", remaining: 5000, unit: "credits" }]);
  assertEquals(quota.credential, "signed");
  assertEquals(calls[0].url, "https://api.clearout.io/v2/account/credits");
});

Deno.test("quota: at or under the account threshold is degraded; zero is down", async () => {
  assertEquals((await quota.check!({}, mockCtx([credits(100, 100)]).ctx)).state, "degraded");
  assertEquals((await quota.check!({}, mockCtx([credits(0, 100)]).ctx)).state, "down");
});

Deno.test("quota: a zero threshold is no alert; missing figures and errors are unknown", async () => {
  assertEquals((await quota.check!({}, mockCtx([credits(3, 0)]).ctx)).state, "ok");
  assertEquals((await quota.check!({}, mockCtx([credits(undefined)]).ctx)).state, "unknown");
  assertEquals((await quota.check!({}, mockCtx([{ status: 401, body: {} }]).ctx)).state, "unknown");
});
