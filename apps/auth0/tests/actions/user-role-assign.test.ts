import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-role-assign.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };

Deno.test("user-role-assign: posts the role ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], conn);
  await action.execute!({ userId: "auth0|1", roleIds: "rol_a, rol_b" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { roles: ["rol_a", "rol_b"] });
});

/** A role NAME matches nothing, silently, so it is caught here. */
Deno.test("user-role-assign: a role name rather than an id is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const err = await assertRejects(
    async () => await action.execute!({ userId: "auth0|1", roleIds: "admin" }, ctx),
    Error,
  );
  assert(/start with `rol_`/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});

Deno.test("user-role-assign: is additive, so it declares itself idempotent", () => {
  assertEquals(action.idempotent, true);
});
