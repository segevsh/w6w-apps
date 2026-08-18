import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-role-list.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };

Deno.test("user-role-list: reads the user's tenant-level roles", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { roles: [{ id: "rol_1" }], total: 1 } }],
    conn,
  );
  await action.execute!({ userId: "auth0|1" }, ctx);
  assertEquals(decodeURIComponent(new URL(calls[0].url).pathname), "/api/v2/users/auth0|1/roles");
});

/** Organization roles are separate and invisible here. */
Deno.test("user-role-list: says organization roles are not included", () => {
  assert(/organization/i.test(action.description!), action.description);
});
