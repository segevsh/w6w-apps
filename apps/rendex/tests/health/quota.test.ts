import { assertEquals } from "@std/assert";
import quota, { ACCOUNT_URL } from "../../health/quota.ts";
import { envelope, errorBody, mockCtx } from "../_helpers.ts";

const acct = (usage: unknown) => envelope({ plan: "free", usage });

Deno.test("quota: signed read of /v1/account", () => {
  assertEquals(ACCOUNT_URL, "https://api.rendex.dev/v1/account");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.kind, "quota");
});

Deno.test("quota: plenty left is ok and reports the bucket", async () => {
  const { ctx, calls } = mockCtx([{
    body: acct({
      used: 50,
      limit: 100,
      remaining: 50,
      unlimited: false,
      resetsAt: "2026-11-01T00:00:00Z",
    }),
  }]);
  const r = await quota.check!({}, ctx);
  assertEquals(calls[0].url, ACCOUNT_URL);
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [{
    id: "credits",
    limit: 100,
    remaining: 50,
    unit: "credits",
    resetAt: "2026-11-01T00:00:00Z",
  }]);
});

Deno.test("quota: 90% is degraded, 100% is down", async () => {
  const a = mockCtx([{ body: acct({ used: 90, limit: 100, remaining: 10 }) }]);
  assertEquals((await quota.check!({}, a.ctx)).state, "degraded");
  const b = mockCtx([{ body: acct({ used: 100, limit: 100, remaining: 0 }) }]);
  assertEquals((await quota.check!({}, b.ctx)).state, "down");
});

Deno.test("quota: unlimited and zero-limit plans are not exhausted", async () => {
  const a = mockCtx([{ body: acct({ used: 5, limit: null, remaining: null, unlimited: true }) }]);
  assertEquals((await quota.check!({}, a.ctx)).state, "ok");
  const b = mockCtx([{ body: acct({ used: 5, limit: 0, remaining: 0 }) }]);
  assertEquals((await quota.check!({}, b.ctx)).state, "ok");
});

Deno.test("quota: errors and malformed bodies are unknown", async () => {
  const a = mockCtx([{ status: 401, body: errorBody("INVALID_KEY", "x") }]);
  assertEquals((await quota.check!({}, a.ctx)).state, "unknown");
  const b = mockCtx([{ body: { success: true, data: {} } }]);
  assertEquals((await quota.check!({}, b.ctx)).state, "unknown");
  const c = mockCtx([{ body: acct({ used: "x" }) }]);
  assertEquals((await quota.check!({}, c.ctx)).state, "unknown");
});
