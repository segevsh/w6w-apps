import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

const INFO = {
  success: true,
  account: { blocked: false },
  usage: {
    api_request_count: 77112,
    max_api_request_count: 500000,
    number_check_count: 430542,
    max_number_check_count: 500000,
  },
};

Deno.test("quota: reports remaining = max - used per bucket", async () => {
  const { ctx, calls } = mockCtx([{ body: INFO }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/info");
  assertEquals(out.quota?.find((q) => q.id === "api_requests")?.remaining, 422888);
  assertEquals(out.quota?.find((q) => q.id === "number_checks")?.remaining, 69458);
});

Deno.test("quota: down when the request allowance is exhausted", async () => {
  const { ctx } = mockCtx([{
    body: { ...INFO, usage: { api_request_count: 10, max_api_request_count: 10 } },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "down");
  assertEquals(out.quota?.[0].remaining, 0);
});

Deno.test("quota: an exhausted number-check bucket alone does not take the app down", async () => {
  const { ctx } = mockCtx([{
    body: { ...INFO, usage: { ...INFO.usage, number_check_count: 500000 } },
  }]);
  assertEquals((await quota.check!({}, ctx)).state, "ok");
});

Deno.test("quota: down on a blocked account", async () => {
  const { ctx } = mockCtx([{ body: { ...INFO, account: { blocked: true } } }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "down");
  assert(out.message?.includes("blocked"), out.message);
});

Deno.test("quota: unknown when /info carries no counters", async () => {
  const { ctx } = mockCtx([{ body: { success: true, account: {} } }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: unknown (never down) when the call itself fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "Invalid API Key" } }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message?.includes("Invalid API Key"), out.message);
});

Deno.test("quota: informational, so a low balance never worsens the verdict", () => {
  assertEquals(quota.severity, "informational");
});
