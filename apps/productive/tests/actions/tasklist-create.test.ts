import { assertEquals, assertRejects } from "@std/assert";
import tasklistCreate from "../../actions/tasklist-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tasklist-create: POST /task_lists sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "task_lists", "attributes": { "name": "x" } } },
  }]);
  const out = await tasklistCreate.execute({
    "name": "sample name",
    "projectId": 7,
    "folderId": 7,
    "position": 7,
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/task_lists");
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

Deno.test("tasklist-create: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("422", "unprocessable_entity", "Invalid", "is invalid"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(tasklistCreate.execute({ "name": "sample name", "projectId": 7 }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("422"), true, err.message);
  assertEquals(err.message.includes("is invalid"), true, err.message);
});

Deno.test("tasklist-create: declares perform and idempotent=false", () => {
  assertEquals(tasklistCreate.type, "perform");
  assertEquals(tasklistCreate.idempotent, false);
  assertEquals(tasklistCreate.key, "tasklist-create");
});
