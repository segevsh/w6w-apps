import { assertEquals } from "@std/assert";
import { mockXeroCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: reads the three X-*Limit-Remaining headers off a GET /Organisation probe", async () => {
  const { ctx, calls } = mockXeroCtx([{
    body: { Organisations: [{ Name: "Acme" }] },
    headers: {
      "x-minlimit-remaining": "59",
      "x-daylimit-remaining": "4999",
      "x-appminlimit-remaining": "9999",
    },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.xero.com/api.xro/2.0/Organisation");
  assertEquals(out.state, "ok");
  assertEquals(out.quota, [
    { id: "minute", limit: 60, remaining: 59, unit: "requests" },
    { id: "day", limit: 5000, remaining: 4999, unit: "requests" },
    { id: "app-minute", limit: 10000, remaining: 9999, unit: "requests" },
  ]);
});

Deno.test("quota: a near-exhausted bucket degrades the worst-of verdict", async () => {
  const { ctx } = mockXeroCtx([{
    body: {},
    headers: {
      "x-minlimit-remaining": "3",
      "x-daylimit-remaining": "4999",
      "x-appminlimit-remaining": "9999",
    },
  }]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

Deno.test("quota: no rate-limit headers at all reports unknown", async () => {
  const { ctx } = mockXeroCtx([{ body: {}, headers: {} }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});
