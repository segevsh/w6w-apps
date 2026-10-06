import { assertEquals, assertRejects } from "@std/assert";
import boardCreate from "../../actions/board-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("board-create: POST /boards sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "boards", "attributes": { "name": "x" } } },
  }]);
  const out = await boardCreate.execute({
    "name": "sample name",
    "projectId": 7,
    "hidden": true,
    "position": 7,
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/boards");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: {
      type: "boards",
      attributes: { "name": "sample name", "project_id": 7, "hidden": true, "position": 7 },
    },
  });
  assertEquals((out as Record<string, unknown>).id, "42");
});

Deno.test("board-create: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("422", "unprocessable_entity", "Invalid", "is invalid"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(boardCreate.execute({ "name": "sample name", "projectId": 7 }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("422"), true, err.message);
  assertEquals(err.message.includes("is invalid"), true, err.message);
});

Deno.test("board-create: declares perform and idempotent=false", () => {
  assertEquals(boardCreate.type, "perform");
  assertEquals(boardCreate.idempotent, false);
  assertEquals(boardCreate.key, "board-create");
});
