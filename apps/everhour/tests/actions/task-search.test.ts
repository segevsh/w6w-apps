import { assertEquals, assertRejects } from "@std/assert";
import taskSearch from "../../actions/task-search.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-search: GET /tasks/search with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ "id": 1 }, { "id": 2 }] }]);
  const out = await taskSearch.execute(
    { "query": "Managem", "limit": 2, "searchInClosed": true },
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/tasks/search");
  assertEquals(queryOf(calls[0].url), {
    "query": "Managem",
    "limit": "2",
    "searchInClosed": "true",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "items": [{ "id": 1 }, { "id": 2 }], "count": 2, "nextPage": 2 });
});

Deno.test("task-search: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        taskSearch.execute({ "query": "Managem", "limit": 2, "searchInClosed": true }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("task-search: declares search", () => {
  assertEquals(taskSearch.type, "search");
});
