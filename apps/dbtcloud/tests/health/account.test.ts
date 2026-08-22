import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import account from "../../health/account.ts";
import quota from "../../health/quota.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };

Deno.test("account: probes this connection's own account and names it", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { data: { name: "Acme", state: 1, plan: "enterprise" } } }],
    { display },
  );
  const result = await account.check!({}, ctx);
  assertEquals(calls[0].url, "https://ab123.us1.dbt.com/api/v2/accounts/42/");
  assertEquals(result.state, "ok");
  assert(result.message!.includes("Acme"), result.message);
});

/**
 * A locked or cancelled account still answers, and every scheduled job in it
 * silently stops running.
 */
Deno.test("account: an account that is not active is degraded, with the reason", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: { name: "Acme", state: 2 } } }], {
    display,
  });
  const result = await account.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/scheduled jobs will not run/.test(result.message!), result.message);
});

/** The derived auth check owns credential failures; a 403 is a different thing. */
Deno.test("account: a 401 is unknown and a 403 is degraded", async () => {
  const unauth = mockCtx([{ status: 401, body: "" }], { display });
  assertEquals((await account.check!({}, unauth.ctx)).state, "unknown");

  const forbidden = mockCtx([{ status: 403, body: "" }], { display });
  const result = await account.check!({}, forbidden.ctx);
  assertEquals(result.state, "degraded");
  assert(/permission-set/.test(result.message!), result.message);
});

Deno.test("account: any other failure is down", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "" }], { display });
  assertEquals((await account.check!({}, ctx)).state, "down");
});

Deno.test("account: a connection with no account id says so rather than guessing", async () => {
  const { ctx, calls } = mockCtx([], { display: { accessUrl: "https://cloud.getdbt.com" } });
  const result = await account.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assertEquals(calls.length, 0);
});

/**
 * dbt publishes its limits but not consumption: the retry headers appear only
 * on the 429, and the penalty is a five-minute cooldown.
 */
Deno.test("quota: is a declared absence carrying the documented limits", () => {
  assertEquals(quota.check, undefined);
  assert(quota.unavailable, "quota should declare its absence");
  const reason = quota.unavailable!.reason;
  assert(/5,000 requests per minute/.test(reason), reason);
  assert(/five-minute cooldown/.test(reason), reason);
  assert(/ONLY on the/.test(reason), reason);
  assertEquals(quota.severity, "informational");
});
