import { assertEquals, assertRejects } from "@std/assert";
import projectTaskSearch from "../../actions/project-task-search.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-task-search: GET /projects/{projectId}/tasks/search with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ "id": 1 }, { "id": 2 }] }]);
  const out = await projectTaskSearch.execute({
    "projectId": "ev:1",
    "query": "Managem",
    "limit": 2,
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/projects/ev:1/tasks/search");
  assertEquals(queryOf(calls[0].url), { "query": "Managem", "limit": "2" });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "items": [{ "id": 1 }, { "id": 2 }], "count": 2, "nextPage": 2 });
});

Deno.test("project-task-search: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        projectTaskSearch.execute({ "projectId": "ev:1", "query": "Managem", "limit": 2 }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("project-task-search: declares search", () => {
  assertEquals(projectTaskSearch.type, "search");
});
