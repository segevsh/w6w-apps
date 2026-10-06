import { assertEquals, assertRejects } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-create: POST /tasks sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "tasks", "attributes": { "name": "x" } } },
  }]);
  const out = await taskCreate.execute({
    "title": "sample title",
    "description": "sample description",
    "projectId": 7,
    "taskListId": 7,
    "assigneeId": 7,
    "parentTaskId": 7,
    "workflowStatusId": 7,
    "serviceId": 7,
    "dueDate": "2026-10-01",
    "startDate": "2026-10-01",
    "dueTime": "sample dueTime",
    "initialEstimate": 7,
    "remainingTime": 7,
    "private": true,
    "customFields": '{"1": "x"}',
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/tasks");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: {
      type: "tasks",
      attributes: {
        "title": "sample title",
        "description": "sample description",
        "project_id": 7,
        "task_list_id": 7,
        "assignee_id": 7,
        "parent_task_id": 7,
        "workflow_status_id": 7,
        "service_id": 7,
        "due_date": "2026-10-01",
        "start_date": "2026-10-01",
        "due_time": "sample dueTime",
        "initial_estimate": 7,
        "remaining_time": 7,
        "private": true,
        "custom_fields": { "1": "x" },
      },
    },
  });
  assertEquals((out as Record<string, unknown>).id, "42");
});

Deno.test("task-create: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("422", "unprocessable_entity", "Invalid", "is invalid"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(taskCreate.execute({ "title": "sample title", "projectId": 7 }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("422"), true, err.message);
  assertEquals(err.message.includes("is invalid"), true, err.message);
});

Deno.test("task-create: declares perform and idempotent=false", () => {
  assertEquals(taskCreate.type, "perform");
  assertEquals(taskCreate.idempotent, false);
  assertEquals(taskCreate.key, "task-create");
});
