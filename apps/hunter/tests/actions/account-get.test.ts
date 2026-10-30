import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/account-get.ts";

test("account-get: GETs /account with no params", async () => {
  const body = envelope({ email: "a@hunter.io", plan_name: "Growth" });
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/account");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
