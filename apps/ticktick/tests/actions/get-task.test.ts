import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-task.ts";

Deno.test("get-task: a task is addressed through its project", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "T1" } }]);
  await action.execute!({ projectId: "P1", taskId: "T1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/project/P1/task/T1");
});

Deno.test("get-task: both ids are encoded independently", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ projectId: "P/1", taskId: "../T" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/project/P%2F1/task/..%2FT");
});

Deno.test("get-task: requires both ids — there is no task-only address", () => {
  assert(action.params!.find((p) => p.key === "projectId")?.required);
  assert(action.params!.find((p) => p.key === "taskId")?.required);
});
