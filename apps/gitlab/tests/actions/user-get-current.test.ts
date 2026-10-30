import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get-current.ts";

test("user-get-current: GETs /user", async () => {
  const body = { id: 1, username: "acme" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://gitlab.com/api/v4/user");
  assertEquals(result, body);
});
