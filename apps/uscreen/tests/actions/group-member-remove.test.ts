import { assertEquals, assertRejects } from "@std/assert";
import groupMemberRemove from "../../actions/group-member-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-member-remove: sends DELETE /groups/${seg(input.groupId)}/members/${seg(input.userId)} and reports ok on an empty 200", async () => {
  const { ctx, calls } = mockCtx([{ body: "" }]);
  const out = await groupMemberRemove.execute({ "groupId": 2, "userId": 7 } as never, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/groups/2/members/7");
  assertEquals(out, { ok: true });
});

Deno.test("group-member-remove: a 404 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Not Found" } }]);
  await assertRejects(
    () =>
      groupMemberRemove.execute({ "groupId": 2, "userId": 7 } as never, ctx) as Promise<unknown>,
    Error,
    "Not Found",
  );
});
