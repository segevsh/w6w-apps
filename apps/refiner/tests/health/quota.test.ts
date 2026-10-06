import { assert, assertEquals } from "@std/assert";
import quota, { ACCOUNT_URL } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const account = (sub: Record<string, unknown>) => ({ subscription: { plan: "Pro", ...sub } });

Deno.test("quota: reads /v1/account, signed, on the app's own host", () => {
  assertEquals(ACCOUNT_URL, "https://api.refiner.io/v1/account");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.network, undefined);
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: a healthy account reports ok with one reading per limit", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: account({
        mtu_count: 9,
        mtu_limit: 5000,
        mpv_count: 42,
        mpv_limit: 1000000,
        msr_count: 23,
        msr_limit: 1000,
        mte_count: 128,
      }),
    },
  ]);
  const r = await quota.check!({}, ctx);
  assertEquals(calls[0].url, ACCOUNT_URL);
  assertEquals(r.state, "ok");
  assertEquals(r.message, undefined);
  assertEquals(r.quota?.length, 3);
  assertEquals(r.quota?.find((q) => q.id === "monthly-tracked-users"), {
    id: "monthly-tracked-users",
    limit: 5000,
    remaining: 4991,
    unit: "users",
  });
});

Deno.test("quota: at 90% or over is degraded and names the dimension; remaining never negative", async () => {
  const { ctx } = mockCtx([
    { body: account({ msr_count: 950, msr_limit: 1000, mtu_count: 7000, mtu_limit: 5000 }) },
  ]);
  const r = await quota.check!({}, ctx);
  assertEquals(r.state, "degraded");
  assert(/monthly-survey-responses at 950\/1000/.test(r.message!), r.message);
  assert(/monthly-tracked-users/.test(r.message!), r.message);
  assertEquals(r.quota?.find((q) => q.id === "monthly-tracked-users")?.remaining, 0);
});

Deno.test("quota: a non-positive limit is not exhaustion, and a missing limit is skipped", async () => {
  const { ctx } = mockCtx([{ body: account({ mtu_count: 3, mtu_limit: 0, mpv_count: 5 }) }]);
  const r = await quota.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota?.map((q) => q.id), ["monthly-tracked-users"]);
});

Deno.test("quota: failures and odd bodies are unknown, never a false alarm", async () => {
  assertEquals((await quota.check!({}, mockCtx([{ status: 401, body: {} }]).ctx)).state, "unknown");
  assertEquals((await quota.check!({}, mockCtx([{ body: {} }]).ctx)).state, "unknown");
  assertEquals((await quota.check!({}, mockCtx([{ body: account({}) }]).ctx)).state, "unknown");
  assertEquals((await quota.check!({}, mockCtx([{ body: "<html>" }]).ctx)).state, "unknown");
});
