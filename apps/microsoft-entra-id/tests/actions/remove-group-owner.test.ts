import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/remove-group-owner.ts";

Deno.test("remove-group-owner: DELETEs .../owners/{id}/$ref", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ groupId: "g1", ownerId: "u1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/groups/g1/owners/u1/$ref");
  assertEquals(out, { removed: true, groupId: "g1", ownerId: "u1" });
});

Deno.test("remove-group-owner: a failure surfaces Graph's code", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { code: "Authorization_RequestDenied", message: "no" } },
  }]);
  await assertRejects(
    async () => await action.execute({ groupId: "g1", ownerId: "u1" }, ctx),
    Error,
    "Authorization_RequestDenied",
  );
});
