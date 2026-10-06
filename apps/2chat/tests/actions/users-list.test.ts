import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import usersList from "../../actions/users-list.ts";

Deno.test("users-list: lists users", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": {
        "users": [{ "uuid": "USR1", "first_name": "Ada", "last_name": "L", "email": "a@x.io" }],
      },
    },
  }]);
  const out = await usersList.execute!({} as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/users");
  assertEquals(calls[0].body, null);
  assertEquals((out as { data: { users: unknown[] } }).data.users.length, 1);
});
