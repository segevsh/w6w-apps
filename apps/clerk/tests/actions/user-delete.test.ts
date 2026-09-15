import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-delete.ts";

Deno.test("user-delete: DELETEs the user only when confirmed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "user_1", deleted: true } }]);
  await action.execute!({ userId: "user_1", confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/users/user_1");
});

Deno.test("user-delete: without confirm=true, nothing is sent", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => await action.execute!({ userId: "user_1" }, ctx),
    Error,
  );
  assert(/confirm/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});
