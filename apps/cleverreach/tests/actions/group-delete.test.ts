import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import action from "../../actions/group-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-delete: DELETEs the group", async () => {
  const { ctx, calls } = mockCtx([{ body: true }]);
  const out = await action.execute({ groupId: "7" }, ctx) as { result: unknown };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v3/groups/7");
  assertEquals(out.result, true);
});

Deno.test("group-delete: surfaces a vendor error", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: { code: 400, message: "group is locked" } },
  }]);
  const err = await assertRejects(async () => await action.execute({ groupId: "7" }, ctx));
  assertMatch((err as Error).message, /CleverReach 400: group is locked/);
});
