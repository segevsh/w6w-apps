import { assertEquals, assertRejects } from "@std/assert";
import assignmentUpdate from "../../actions/assignment-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("assignment-update: PUT /resource-planner/assignments/{assignmentId} with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await assignmentUpdate.execute({
    "assignmentId": 8495,
    "startDate": "2019-01-21",
    "endDate": "2019-02-01",
    "time": 3600,
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/resource-planner/assignments/8495");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "endDate": "2019-02-01",
    "startDate": "2019-01-21",
    "time": 3600,
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("assignment-update: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        assignmentUpdate.execute({
          "assignmentId": 8495,
          "startDate": "2019-01-21",
          "endDate": "2019-02-01",
          "time": 3600,
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("assignment-update: declares perform and idempotent=true", () => {
  assertEquals(assignmentUpdate.type, "perform");
  assertEquals(assignmentUpdate.idempotent, true);
});
