import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: hits GET /users/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "user_1" } }]);
  await action.execute!({ userId: "user_1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/users/user_1");
});

Deno.test("user-get: a missing userId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => await action.execute!({}, ctx), Error);
  assert(/userId/.test(String(err)));
  assertEquals(calls.length, 0);
});

Deno.test("user-get: a not-found user surfaces Clerk's own error shape", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: {
      errors: [{ message: "Not found", long_message: "Not found", code: "resource_not_found" }],
    },
  }]);
  const err = await assertRejects(
    async () => await action.execute!({ userId: "user_x" }, ctx),
    Error,
  );
  assert(/Not found/.test(String(err)), String(err));
});
