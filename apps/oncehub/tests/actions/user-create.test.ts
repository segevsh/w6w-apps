import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-create.ts";

test("user-create: POSTs /users with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "USR-1" } }]);
  await action.execute(
    {
      email: "carrie@example.com",
      firstName: "Carrie",
      lastName: "Customer",
      roleName: "Administrator",
      teams: ["TM-1"],
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/users");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "carrie@example.com",
    first_name: "Carrie",
    last_name: "Customer",
    role_name: "Administrator",
    teams: ["TM-1"],
  });
});
