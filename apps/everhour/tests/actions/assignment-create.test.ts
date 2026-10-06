import { assertEquals, assertRejects } from "@std/assert";
import assignmentCreate from "../../actions/assignment-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("assignment-create: POST /resource-planner/assignments with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await assignmentCreate.execute({
    "project": "as:9",
    "startDate": "2019-01-21",
    "endDate": "2019-02-01",
    "time": 252000,
    "type": "project",
    "users": "79786,79787",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/resource-planner/assignments");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "endDate": "2019-02-01",
    "project": "as:9",
    "startDate": "2019-01-21",
    "time": 252000,
    "type": "project",
    "users": [79786, 79787],
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("assignment-create: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        assignmentCreate.execute({
          "project": "as:9",
          "startDate": "2019-01-21",
          "endDate": "2019-02-01",
          "time": 252000,
          "type": "project",
          "users": "79786,79787",
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("assignment-create: declares perform and idempotent=false", () => {
  assertEquals(assignmentCreate.type, "perform");
  assertEquals(assignmentCreate.idempotent, false);
});
