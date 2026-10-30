import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx } from "../_helpers.ts";
import usersList from "../../actions/users-list.ts";

test("users-list: lists users", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": {
        "users": [{ "uuid": "USR1", "first_name": "Ada", "last_name": "L", "email": "a@x.io" }],
      },
    },
  }]);
  const out = await usersList.execute!({} as never, ctx);
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "GET");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/users");
  assert.deepStrictEqual(calls[0].body, null);
  assert.deepStrictEqual((out as { data: { users: unknown[] } }).data.users.length, 1);
});
