import { assertEquals, assertRejects } from "@std/assert";
import taskUpdate from "../../actions/task-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-update: PATCH /tasks/{id} sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "tasks", "attributes": { "name": "x" } } },
  }]);
  const out = await taskUpdate.execute({
    "id": "42",
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
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/tasks/42");
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

Deno.test("task-update: only the fields set are sent", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "tasks", "attributes": { "name": "x" } } },
  }]);
  await taskUpdate.execute({ id: "42", title: "sample title" }, ctx);
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: { type: "tasks", attributes: { "title": "sample title" } },
  });
});

Deno.test("task-update: naming no field to change fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(taskUpdate.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("at least one field"), true, err.message);
  assertEquals(calls.length, 0);
});

Deno.test("task-update: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("404", "not_found", "Not Found", "Resource not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(taskUpdate.execute({ id: "42", title: "sample title" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Resource not found"), true, err.message);
});

Deno.test("task-update: declares perform and idempotent=true", () => {
  assertEquals(taskUpdate.type, "perform");
  assertEquals(taskUpdate.idempotent, true);
  assertEquals(taskUpdate.key, "task-update");
});
