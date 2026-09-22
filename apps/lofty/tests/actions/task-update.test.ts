import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-update.ts";

Deno.test("task-update: puts the full body and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await action.execute!({
    taskId: 9,
    content: "Call back",
    leadId: 1,
    deadline: 1508580010000,
    type: "Call",
    assignedRole: "Agent",
    finishFlag: true,
  }, ctx) as { taskId: number; status: number };

  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/tasks/9");
  assertEquals(JSON.parse(calls[0].body!), {
    content: "Call back",
    leadId: 1,
    deadline: 1508580010000,
    type: "Call",
    assignedRole: "Agent",
    finishFlag: true,
  });
  assertEquals(result, { taskId: 9, status: 200 });
});

/**
 * The schema marks these required even though the description says "partial",
 * so none of them is optional here.
 */
Deno.test("task-update: keeps the schema's required fields required", () => {
  for (const key of ["content", "leadId", "deadline", "type", "assignedRole"]) {
    assertEquals(action.params!.find((p) => p.key === key)!.required, true, key);
  }
  assertEquals(action.params!.find((p) => p.key === "finishFlag")!.required, undefined);
});
