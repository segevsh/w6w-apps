import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: ok with remaining credits and the reset time, from a GET /account", async () => {
  const { ctx, calls } = mockCtx([{
    body: { remaining_total_credits: 250, resets_at: 1617073667 },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota, [{
    id: "credits",
    remaining: 250,
    unit: "credits",
    resetAt: "2021-03-30T03:07:47.000Z",
  }]);
  assertEquals(out.message, "250 credits remaining");
  assertEquals(calls[0].url, "https://api.webscraping.ai/account");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: zero credits is down; a missing counter or a non-2xx is unknown", async () => {
  const zero = await quota.check!({}, mockCtx([{ body: { remaining_total_credits: 0 } }]).ctx);
  assertEquals(zero.state, "down");
  assertEquals(zero.quota?.[0].remaining, 0);
  assertEquals(
    (await quota.check!({}, mockCtx([{ body: { email: "x" } }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await quota.check!({}, mockCtx([{ status: 403, body: { message: "Wrong API key." } }]).ctx))
      .state,
    "unknown",
  );
});
