import { assertEquals, assertRejects } from "@std/assert";
import todoCreate from "../../actions/todo-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("todo-create: POST /todos sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "todos", "attributes": { "name": "x" } } },
  }]);
  const out = await todoCreate.execute({
    "description": "sample description",
    "taskId": 7,
    "dealId": 7,
    "assigneeId": 7,
    "dueDate": "2026-10-01",
    "position": 7,
    "closed": true,
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/todos");
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

Deno.test("todo-create: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("422", "unprocessable_entity", "Invalid", "is invalid"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(todoCreate.execute({ "description": "sample description" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("422"), true, err.message);
  assertEquals(err.message.includes("is invalid"), true, err.message);
});

Deno.test("todo-create: declares perform and idempotent=false", () => {
  assertEquals(todoCreate.type, "perform");
  assertEquals(todoCreate.idempotent, false);
  assertEquals(todoCreate.key, "todo-create");
});
