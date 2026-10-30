import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import taskCancel from "../../actions/task-cancel.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("task-cancel: POSTs /v2/tasks/{id}/cancel", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ id: "t1", status: "processing" }),
  }]);
  const out = await taskCancel.execute({ taskId: "t1" }, ctx) as { status: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/tasks/t1/cancel");
  assertEquals(out.status, "processing");
});

test("task-cancel: is declared non-idempotent — CloudConvert documents no repeat-call behavior", () => {
  assertEquals(taskCancel.idempotent, false);
});
