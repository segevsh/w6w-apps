import { assert, assertEquals, assertRejects } from "@std/assert";
import getUniversalAccount from "../../actions/get-universal-account.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-universal-account: returns usage and NEVER the api_key the vendor echoes", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: 3,
      email: "a@b.c",
      api_key: "LEAKED-KEY-123",
      plan: { id: 1, name: "Universal" },
      credit_usage: { credits_allocated: 1000, credits_used: 40, credits_remaining: 960 },
      credit_usage_by_action: [{ credit_action: "PersonSearch", credits_used: 40 }],
      daily_api_num_calls: 7,
      daily_api_limit: "1000",
    },
  }]);
  const out = await run(getUniversalAccount, {}, ctx);
  assertEquals(calls[0].url, "https://api.rocketreach.co/api/v2/universal/account/");
  assertEquals(out.creditUsage.credits_remaining, 960);
  assertEquals(out.creditUsageByAction.length, 1);
  assertEquals(out.dailyApiNumCalls, 7);
  assert(!JSON.stringify(out).includes("LEAKED-KEY-123"));
  assertEquals("apiKey" in out || "api_key" in out, false);
});

Deno.test("get-universal-account: a 403 throws", async () => {
  const bad = mockCtx([{ status: 403, body: { detail: "Not a Universal Credits account" } }]);
  await assertRejects(() => run(getUniversalAccount, {}, bad.ctx), Error, "Universal Credits");
});
