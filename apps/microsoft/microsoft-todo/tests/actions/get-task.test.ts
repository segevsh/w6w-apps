import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-task.ts";

Deno.test("get-task: GETs the task and encodes both ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "T=1" } }]);
  await action.execute!({ taskList: "L=1", task: "T/1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/todo/lists/L%3D1/tasks/T%2F1");
});

Deno.test("get-task: $expand pulls the navigation properties inline", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    taskList: "L1",
    task: "T1",
    expand: ["checklistItems", "linkedResources"],
    select: ["id"],
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("$expand"), "checklistItems,linkedResources");
  assertEquals(p.get("$select"), "id");
});
