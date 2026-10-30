import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import taskUnlinkConversation from "../../actions/task-unlink-conversation.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("task-unlink-conversation: POSTs /v1/tasks/{taskId}/unlink-conversation with conversationId", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { taskId: "TK1", revision: "3" } },
  }]);
  await taskUnlinkConversation.execute({ taskId: "TK1", conversationId: "CN1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/TK1/unlink-conversation");
  assertEquals(JSON.parse(calls[0].body!), { conversationId: "CN1" });
});

test("task-unlink-conversation: is an idempotent perform action", () => {
  assertEquals(taskUnlinkConversation.type, "perform");
  assertEquals(taskUnlinkConversation.idempotent, true);
});
