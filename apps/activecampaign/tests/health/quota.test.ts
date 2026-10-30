import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockActiveCampaignCtx, mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

test("quota: quota / connection / signed posture, no extra network.allow", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
});

test("quota: unknown when the connection records no apiUrl", async () => {
  const { ctx } = mockCtx();
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

test("quota: reads RateLimit-* headers off the probe response", async () => {
  const { ctx, calls } = mockActiveCampaignCtx([{
    status: 200,
    body: { contacts: [] },
    headers: {
      "content-type": "application/json",
      "ratelimit-limit": "5",
      "ratelimit-remaining": "4",
    },
  }]);
  const result = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://acme.api-us1.com/api/3/contacts?limit=1");
  assertEquals(result.state, "ok");
  assertEquals(result.quota, [{ id: "account", limit: 5, remaining: 4, unit: "requests" }]);
});

test("quota: degraded under 20% headroom, down at zero", async () => {
  const low = mockActiveCampaignCtx([{
    headers: {
      "content-type": "application/json",
      "ratelimit-limit": "5",
      "ratelimit-remaining": "0",
    },
  }]);
  assertEquals((await quota.check!({}, low.ctx)).state, "down");

  const degraded = mockActiveCampaignCtx([{
    headers: {
      "content-type": "application/json",
      "ratelimit-limit": "10",
      "ratelimit-remaining": "1",
    },
  }]);
  assertEquals((await quota.check!({}, degraded.ctx)).state, "degraded");
});

test("quota: unknown when the response carries no RateLimit-* headers", async () => {
  const { ctx } = mockActiveCampaignCtx([{ status: 200, body: {} }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
});
