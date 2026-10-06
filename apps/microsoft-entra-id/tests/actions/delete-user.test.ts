import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-user.ts";

Deno.test("delete-user: DELETEs /users/{id} and reports success on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ userId: "u1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/users/u1");
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true, userId: "u1" });
});

Deno.test("delete-user: a 404 is an error carrying Graph's code", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: { code: "Request_ResourceNotFound", message: "gone" } },
  }]);
  await assertRejects(
    async () => await action.execute({ userId: "u1" }, ctx),
    Error,
    "Request_ResourceNotFound",
  );
});
