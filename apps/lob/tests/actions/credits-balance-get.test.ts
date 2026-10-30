import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import creditsBalanceGet from "../../actions/credits-balance-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

test("credits-balance-get: GETs /accounts and returns the balance", async () => {
  const { ctx, calls } = mockCtx([{ body: { balance: 12.5 } }]);
  const out = await creditsBalanceGet.execute({}, ctx) as { balance: number };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/accounts");
  assertEquals(out.balance, 12.5);
});

test("credits-balance-get: a missing credential surfaces Lob's code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("unauthorized", "Missing authentication", 401),
  }]);
  await assertRejects(async () => await creditsBalanceGet.execute({}, ctx), Error, "unauthorized");
});
