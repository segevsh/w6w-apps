import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-delete.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };

Deno.test("user-delete: refuses without confirmation, and points at blocking", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const err = await assertRejects(
    async () => await action.execute!({ userId: "auth0|1" }, ctx),
    Error,
  );
  assert(/blocking instead/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});

Deno.test("user-delete: confirmed, it deletes", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], conn);
  assertEquals(await action.execute!({ userId: "auth0|1", confirm: true }, ctx), {
    ok: true,
    userId: "auth0|1",
  });
  assertEquals(calls[0].method, "DELETE");
});

/** Deleting does not revoke live tokens — that surprises people. */
Deno.test("user-delete: says what a delete does not do", () => {
  assert(/does not revoke live tokens|not revoke/i.test(action.description!), action.description);
});
