import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-create.ts";

Deno.test("task-create: posts the deadline as epoch milliseconds", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { taskId: 563172647619608 } }]);
  const result = await action.execute!({
    content: "Send an email to my lead",
    leadId: 563172647619608,
    deadline: 1508580010000,
    type: "Call",
    assignedRole: "Agent",
  }, ctx) as { taskId: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/tasks");
  assertEquals(JSON.parse(calls[0].body!), {
    content: "Send an email to my lead",
    leadId: 563172647619608,
    deadline: 1508580010000,
    type: "Call",
    assignedRole: "Agent",
  });
  assertEquals(result.taskId, 563172647619608);
});

Deno.test("task-create: finishFlag is omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { taskId: 1 } }]);
  await action.execute!({
    content: "c",
    leadId: 1,
    deadline: 1,
    type: "Call",
    assignedRole: "Agent",
  }, ctx);
  assertEquals("finishFlag" in JSON.parse(calls[0].body!), false);
});

Deno.test("task-create: the deadline hint says milliseconds, not a date string", () => {
  const deadline = action.params!.find((p) => p.key === "deadline")!;
  assertEquals(deadline.required, true);
  assert(/epoch/.test(deadline.hint!), deadline.hint);
});
