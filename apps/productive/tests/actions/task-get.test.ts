import { assertEquals, assertRejects } from "@std/assert";
import taskGet from "../../actions/task-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-get: GET /tasks/{id} flattens the resource", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "tasks", "attributes": { "name": "x" } } },
  }]);
  const out = await taskGet.execute({ id: "42", include: "project" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/tasks/42");
  assertEquals(queryOf(calls[0].url), { include: "project" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(out.id, "42");
  assertEquals(out.type, "tasks");
  assertEquals(out.name, "x");
});

Deno.test("task-get: an id cannot change the path", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "tasks", "attributes": { "name": "x" } } },
  }]);
  await taskGet.execute({ id: "4/../x" }, ctx);
  assertEquals(new URL(calls[0].url).pathname.startsWith("/api/v2/tasks/"), true);
  assertEquals(pathOf(calls[0].url), "/api/v2/tasks/4%2F..%2Fx");
});

Deno.test("task-get: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("404", "not_found", "Not Found", "Resource not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(taskGet.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Resource not found"), true, err.message);
});

Deno.test("task-get: declares read", () => {
  assertEquals(taskGet.type, "read");
  assertEquals(taskGet.idempotent, undefined);
  assertEquals(taskGet.key, "task-get");
});
