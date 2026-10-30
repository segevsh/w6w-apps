import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-task.ts";

test("delete-task: DELETEs the project-nested task path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await action.execute!({ projectId: "P1", taskId: "T1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/project/P1/task/T1");
  assertEquals(out, { status: 200 });
});

test("delete-task: no body is sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await action.execute!({ projectId: "P1", taskId: "T1" }, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["content-type"], undefined);
});

test("delete-task: idempotent for retry purposes", () => {
  assertEquals(action.idempotent, true);
  assertEquals(action.type, "perform");
});
