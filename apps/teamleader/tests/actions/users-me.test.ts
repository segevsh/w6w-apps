import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/users-me.ts";

test("users-me: POSTs users.me with an empty body and returns the user", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "u1", email: "j@x.eu" } } }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/users.me");
  assertEquals(calls[0].body, "{}");
  assertEquals(out, { user: { id: "u1", email: "j@x.eu" } });
});
