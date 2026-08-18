import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";
import concurrency from "../../health/concurrency.ts";

const display = { projectId: "proj_1", projectName: "Acme" };
const balances = (list: unknown[]) => ({ status: 200, body: { balances: list } });

/** A genuinely readable quota, which is rarer than it should be. */
Deno.test("quota: reports the remaining balance as a real number", async () => {
  const { ctx, calls } = mockCtx(
    [balances([{ balance_id: "b1", amount: 42.5, units: "usd" }])],
    { display },
  );
  const result = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.deepgram.com/v1/projects/proj_1/balances");
  assertEquals(result.state, "ok");
  assertEquals(result.quota![0].remaining, 42.5);
  assert(result.message!.includes("42.50 usd"), result.message);
});

/** Running out stops transcription rather than slowing it. */
Deno.test("quota: no credit is down, and says requests are refused not slowed", async () => {
  const { ctx } = mockCtx([balances([{ balance_id: "b1", amount: 0, units: "usd" }])], { display });
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/refused, not slowed/.test(result.message!), result.message);
});

/** An invoiced account has no balance, which is not zero credit. */
Deno.test("quota: an empty balance list is unknown, never down", async () => {
  const { ctx } = mockCtx([balances([])], { display });
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/invoiced enterprise contract/.test(result.message!), result.message);
});

/** A key without the scope cannot read this, and that is not an outage. */
Deno.test("quota: a 401 or 403 is unknown with the scope named", async () => {
  for (const status of [401, 403]) {
    const { ctx } = mockCtx([{ status, body: "" }], { display });
    const result = await quota.check!({}, ctx);
    assertEquals(result.state, "unknown");
    assert(/scope/.test(result.message!), result.message);
  }
});

Deno.test("quota: any other failure is unknown rather than a false alarm", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }], { display });
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: a connection with no project id says so rather than guessing", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
  assertEquals(calls.length, 0);
});

/**
 * Deepgram's other limit is concurrency, which cannot be measured without
 * consuming it.
 */
Deno.test("concurrency: is a declared absence carrying the documented ceilings", () => {
  assertEquals(concurrency.check, undefined);
  assert(concurrency.unavailable, "concurrency should declare its absence");
  const reason = concurrency.unavailable!.reason;
  assert(/50 concurrent pre-recorded/.test(reason), reason);
  assert(/CONCURRENT/.test(reason), reason);
  assert(/2026-08-18/.test(reason), reason);
  assertEquals(concurrency.severity, "informational");
});
