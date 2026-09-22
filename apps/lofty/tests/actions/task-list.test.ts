import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-list.ts";

Deno.test("task-list: filters by lead and returns both open and finished tasks", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      taskList: [
        { id: 1, finishFlag: false, overdueFlag: true },
        { id: 2, finishFlag: true, overdueFlag: false },
      ],
    },
  }]);
  const result = await action.execute!({ leadId: 555 }, ctx) as {
    taskList: Array<{ finishFlag: boolean }>;
  };

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/tasks");
  assertEquals(new URL(calls[0].url).searchParams.get("leadId"), "555");
  assertEquals(result.taskList.length, 2);
  assertEquals(result.taskList.filter((t) => !t.finishFlag).length, 1);
});

Deno.test("task-list: leadId is required", () => {
  assertEquals(action.params!.find((p) => p.key === "leadId")!.required, true);
});
