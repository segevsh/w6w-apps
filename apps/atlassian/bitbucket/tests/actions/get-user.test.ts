import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-user.ts";

test("get-user: GETs /user", async () => {
  const { ctx, calls } = mockCtx([{ body: { account_id: "acc-1" } }]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/2.0/user");
  assertEquals((result as { account_id: string }).account_id, "acc-1");
});
