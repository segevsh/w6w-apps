import { assertEquals, assertRejects } from "@std/assert";
import tasklistUpdate from "../../actions/tasklist-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tasklist-update: PATCH /task_lists/{id} sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "task_lists", "attributes": { "name": "x" } } },
  }]);
  const out = await tasklistUpdate.execute({
    "id": "42",
    "name": "sample name",
    "projectId": 7,
    "folderId": 7,
    "position": 7,
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/task_lists/42");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: {
      type: "task_lists",
      attributes: { "name": "sample name", "project_id": 7, "folder_id": 7, "position": 7 },
    },
  });
  assertEquals((out as Record<string, unknown>).id, "42");
});

Deno.test("tasklist-update: only the fields set are sent", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "task_lists", "attributes": { "name": "x" } } },
  }]);
  await tasklistUpdate.execute({ id: "42", name: "sample name" }, ctx);
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: { type: "task_lists", attributes: { "name": "sample name" } },
  });
});

Deno.test("tasklist-update: naming no field to change fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(tasklistUpdate.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("at least one field"), true, err.message);
  assertEquals(calls.length, 0);
});

Deno.test("tasklist-update: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("404", "not_found", "Not Found", "Resource not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(tasklistUpdate.execute({ id: "42", name: "sample name" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Resource not found"), true, err.message);
});

Deno.test("tasklist-update: declares perform and idempotent=true", () => {
  assertEquals(tasklistUpdate.type, "perform");
  assertEquals(tasklistUpdate.idempotent, true);
  assertEquals(tasklistUpdate.key, "tasklist-update");
});
