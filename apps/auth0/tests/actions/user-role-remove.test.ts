import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-role-remove.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };

/** Auth0 takes the ids in a body on a DELETE. */
Deno.test("user-role-remove: the DELETE carries a body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], conn);
  await action.execute!({ userId: "auth0|1", roleIds: "rol_a" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assert(calls[0].body, "a DELETE with no body would change nothing");
  assertEquals(JSON.parse(calls[0].body!), { roles: ["rol_a"] });
});

Deno.test("user-role-remove: an empty role list is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ userId: "auth0|1" }, ctx),
    Error,
    "roleIds",
  );
});
