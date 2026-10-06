import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-group.ts";

Deno.test("delete-group: DELETEs /groups/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ groupId: "g1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/groups/g1");
  assertEquals(out, { deleted: true, groupId: "g1" });
});

Deno.test("delete-group: a 403 on a protected group is an error with Graph's code", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { code: "Authorization_RequestDenied", message: "role-assignable" } },
  }]);
  await assertRejects(
    async () => await action.execute({ groupId: "g1" }, ctx),
    Error,
    "Authorization_RequestDenied",
  );
});
