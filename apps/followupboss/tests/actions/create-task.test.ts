import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import createTask from "../../actions/create-task.ts";
import { TASK_TYPES } from "../../lib/client.ts";

Deno.test("create-task: POSTs /tasks with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 4066 } }]);
  await createTask.execute({
    personId: 15013,
    name: "Follow Up",
    type: "Follow Up",
    assignedUserId: 1,
    dueDateTime: "2026-01-31T21:00:00Z",
    remindSecondsBefore: 900,
  }, ctx);
  assertEquals(calls[0].url, "https://api.followupboss.com/v1/tasks");
  assertEquals(JSON.parse(calls[0].body!), {
    personId: 15013,
    name: "Follow Up",
    type: "Follow Up",
    assignedUserId: 1,
    dueDateTime: "2026-01-31T21:00:00Z",
    remindSecondsBefore: 900,
  });
});

Deno.test("create-task: offers exactly the nine documented task types", () => {
  assertEquals(optionValues(createTask, "type"), [...TASK_TYPES]);
});

/**
 * Neither assignee field is individually `required`, but the API needs one of
 * them. The only place that can be said is the hints and the description.
 */

/**
 * Neither assignee field is individually `required`, but the API needs one of
 * them. The only place that can be said is the hints and the description.
 */
Deno.test("create-task: explains the one-of-two assignee rule", () => {
  assertEquals((createTask.params ?? []).filter((p) => p.required).map((p) => p.key), ["personId"]);
  assert(param(createTask, "assignedUserId").hint?.includes("Required unless"));
  assert(param(createTask, "assignedTo").hint?.includes("Required unless"));
  assert(/exactly one/i.test(createTask.description!), createTask.description);
});

Deno.test("create-task: notes that reminders need a due TIME, not just a date", () => {
  assert(param(createTask, "remindSecondsBefore").hint?.includes("Due date/time"));
});
