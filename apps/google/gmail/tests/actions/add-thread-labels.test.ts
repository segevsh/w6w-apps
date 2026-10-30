import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-thread-labels.ts";

test("add-thread-labels: POSTs threads/{id}/modify with addLabelIds", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await action.execute!({ threadId: "t1", labelIds: ["STARRED"] }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/gmail/v1/users/me/threads/t1/modify");
  assertEquals(JSON.parse(calls[0].body!), { addLabelIds: ["STARRED"] });
});
