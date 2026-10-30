import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import taskConfirmAction from "../../actions/task-confirm-action.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

test("task-confirm-action: posts task_id and event_id", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ task_id: "t1", confirmed: true }) }]);
  const out = await taskConfirmAction.execute({ taskId: "t1", eventId: "e1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/task.confirmAction");
  assertEquals(JSON.parse(calls[0].body!), { task_id: "t1", event_id: "e1" });
  assertEquals(out.confirmed, true);
});

test("task-confirm-action: passes input through when given", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ task_id: "t1", confirmed: true }) }]);
  await taskConfirmAction.execute({ taskId: "t1", eventId: "e1", input: { approved: true } }, ctx);
  assertEquals(JSON.parse(calls[0].body!).input, { approved: true });
});

test("task-confirm-action: is not idempotent", () => {
  assertEquals(taskConfirmAction.idempotent, false);
});
