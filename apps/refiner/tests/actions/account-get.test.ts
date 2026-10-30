import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import accountGet from "../../actions/account-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

test("account-get: GETs /v1/account and returns subscription and environments", async () => {
  const body = { subscription: { plan: "Pro", mtu_count: 9, mtu_limit: 5000 }, environments: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await accountGet.execute({}, ctx), body);
  assertEquals(pathOf(calls[0].url), "/v1/account");
  assertEquals(calls[0].method, "GET");
});

test("account-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(accountGet.execute({}, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
