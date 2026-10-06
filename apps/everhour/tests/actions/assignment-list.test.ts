import { assertEquals, assertRejects } from "@std/assert";
import assignmentList from "../../actions/assignment-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("assignment-list: GET /resource-planner/assignments with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ "id": 1 }, { "id": 2 }] }]);
  const out = await assignmentList.execute({
    "type": "assignment",
    "project": "ev:1",
    "from": "2020-11-19",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/resource-planner/assignments");
  assertEquals(queryOf(calls[0].url), {
    "type": "assignment",
    "project": "ev:1",
    "from": "2020-11-19",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "items": [{ "id": 1 }, { "id": 2 }], "count": 2, "nextPage": null });
});

Deno.test("assignment-list: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        assignmentList.execute(
          { "type": "assignment", "project": "ev:1", "from": "2020-11-19" },
          ctx,
        ),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("assignment-list: declares search", () => {
  assertEquals(assignmentList.type, "search");
});
