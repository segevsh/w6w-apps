import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import groupDelete from "../../actions/group-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("group-delete: DELETEs /v2/groups/{id} with delete_subscribers in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, message: "Group deleted" } }]);
  await groupDelete.execute({ id: "g1", deleteSubscribers: true }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/groups/g1");
  assertEquals(JSON.parse(calls[0].body!), { delete_subscribers: true });
});

test("group-delete: omits delete_subscribers from the body when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, message: "Group deleted" } }]);
  await groupDelete.execute({ id: "g1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
