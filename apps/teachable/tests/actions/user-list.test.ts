import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userList from "../../actions/user-list.ts";
import { envelope, mockCtx, queryOf } from "../_helpers.ts";

test("user-list: defaults per to 20 and forwards search_after when given", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("users", []) }]);
  await userList.execute({ searchAfter: 12345 }, ctx);

  assertEquals(queryOf(calls[0].url), { per: "20", search_after: "12345" });
});

test("user-list: filters by email", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("users", []) }]);
  await userList.execute({ email: "a@b.com" }, ctx);

  assertEquals(queryOf(calls[0].url), { email: "a@b.com", per: "20" });
});
