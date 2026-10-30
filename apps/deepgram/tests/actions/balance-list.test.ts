import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/balance-list.ts";

const display = { projectId: "proj_1" };

test("balance-list: totals the remaining credit", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { balances: [{ amount: 20 }, { amount: 12.5 }] } }],
    { display },
  );
  const result = await action.execute!({}, ctx) as { total: number; hasBalance: boolean };
  assertEquals(calls[0].url, "https://api.deepgram.com/v1/projects/proj_1/balances");
  assertEquals(result.total, 32.5);
  assertEquals(result.hasBalance, true);
});

/** An invoiced account has no balance, which is not the same as zero credit. */
test("balance-list: an empty list reports hasBalance false, not zero credit", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { balances: [] } }], { display });
  const result = await action.execute!({}, ctx) as { total: number; hasBalance: boolean };
  assertEquals(result.total, 0);
  assertEquals(result.hasBalance, false);
});

test("balance-list: says running out stops rather than slows", () => {
  assert(/stops transcription rather than slowing/.test(action.description!), action.description);
});
