import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/remove-group-member.ts";

Deno.test("remove-group-member: DELETEs .../members/{id}/$ref — never the bare member object", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ groupId: "g1", memberId: "u1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/groups/g1/members/u1/$ref");
  assert(calls[0].url.endsWith("/$ref"), "without /$ref Graph deletes the member object itself");
  assertEquals(out, { removed: true, groupId: "g1", memberId: "u1" });
});

Deno.test("remove-group-member: a missing member is Graph's 404, surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: { code: "Request_ResourceNotFound", message: "not a member" } },
  }]);
  await assertRejects(
    async () => await action.execute({ groupId: "g1", memberId: "u9" }, ctx),
    Error,
    "Request_ResourceNotFound",
  );
});
