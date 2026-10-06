import { assertEquals, assertRejects } from "@std/assert";
import todoUpdate from "../../actions/todo-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("todo-update: PATCH /todos/{id} sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "todos", "attributes": { "name": "x" } } },
  }]);
  const out = await todoUpdate.execute({
    "id": "42",
    "description": "sample description",
    "taskId": 7,
    "dealId": 7,
    "assigneeId": 7,
    "dueDate": "2026-10-01",
    "position": 7,
    "closed": true,
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/todos/42");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: {
      type: "todos",
      attributes: {
        "description": "sample description",
        "task_id": 7,
        "deal_id": 7,
        "assignee_id": 7,
        "due_date": "2026-10-01",
        "position": 7,
        "closed": true,
      },
    },
  });
  assertEquals((out as Record<string, unknown>).id, "42");
});

Deno.test("todo-update: only the fields set are sent", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "todos", "attributes": { "name": "x" } } },
  }]);
  await todoUpdate.execute({ id: "42", description: "sample description" }, ctx);
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: { type: "todos", attributes: { "description": "sample description" } },
  });
});

Deno.test("todo-update: naming no field to change fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(todoUpdate.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("at least one field"), true, err.message);
  assertEquals(calls.length, 0);
});

Deno.test("todo-update: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("404", "not_found", "Not Found", "Resource not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(todoUpdate.execute({ id: "42", description: "sample description" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Resource not found"), true, err.message);
});

Deno.test("todo-update: declares perform and idempotent=true", () => {
  assertEquals(todoUpdate.type, "perform");
  assertEquals(todoUpdate.idempotent, true);
  assertEquals(todoUpdate.key, "todo-update");
});
