import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import account from "../../health/account.ts";
import quota from "../../health/quota.ts";

const user = (modes: string[], extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { name: "Acme", api_keys: modes.map((mode) => ({ mode })), ...extra },
});

Deno.test("account: a production account is ok, with its balance", async () => {
  const { ctx, calls } = mockCtx([user(["production"], { balance: "42.10" })]);
  const result = await account.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.easypost.com/v2/users");
  assertEquals(result.state, "ok");
  assert(result.message!.includes("42.10"), result.message);
});

/**
 * The failure this check exists for: a test key succeeds at everything and buys
 * nothing, which no credential check can see.
 */
Deno.test("account: a test key is degraded, with the reason spelled out", async () => {
  const { ctx } = mockCtx([user(["test"])]);
  const result = await account.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/TEST key/.test(result.message!), result.message);
  assert(/nothing is ever purchased/.test(result.message!), result.message);
});

Deno.test("account: an unstated mode is unknown rather than assumed", async () => {
  const { ctx } = mockCtx([user(["test", "production"])]);
  const result = await account.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/did not state/.test(result.message!), result.message);
});

/** The derived auth check owns credential failures. */
Deno.test("account: a 401 or 403 is unknown rather than down", async () => {
  for (const status of [401, 403]) {
    const { ctx } = mockCtx([{ status, body: "" }]);
    assertEquals((await account.check!({}, ctx)).state, "unknown", String(status));
  }
});

Deno.test("account: any other failure is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await account.check!({}, ctx)).state, "down");
});

/**
 * A per-second burst limit has no headroom to report — asking "how much is
 * left" is not a question it answers.
 */
Deno.test("quota: is a declared absence explaining why a burst limit cannot be polled", () => {
  assertEquals(quota.check, undefined);
  assert(quota.unavailable, "quota should declare its absence");
  const reason = quota.unavailable!.reason;
  assert(/BURST limit/.test(reason), reason);
  assert(/five requests per second/.test(reason), reason);
  assert(/60 carrier accounts/.test(reason), reason);
  assert(/2026-08-18/.test(reason), reason);
  assertEquals(quota.severity, "informational");
});

/** Balance does deplete, and is read by the account check rather than here. */
Deno.test("quota: points at the account check for the thing that does run out", () => {
  assert(/`account` check/.test(quota.unavailable!.reason), quota.unavailable!.reason);
});
