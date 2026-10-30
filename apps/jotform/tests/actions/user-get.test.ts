import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

test("user-get: GETs /user and returns the unwrapped content", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ username: "johnsmith", status: "ACTIVE" }, { "limit-left": 4999 }) },
  ]);
  const result = await action.execute({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/user");
  assertEquals(url.search, "");
  assertEquals(result, { username: "johnsmith", status: "ACTIVE" });
});
