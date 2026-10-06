import { assertEquals, assertRejects } from "@std/assert";
import fieldCreate from "../../actions/field-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("field-create: POST /projects/{projectId}/fields with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await fieldCreate.execute({
    "projectId": "ev:1",
    "name": "Priority",
    "type": "select",
    "options": '[{"name":"High","color":"#FC5500"}]',
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/projects/ev:1/fields");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "Priority",
    "type": "select",
    "options": [{ "name": "High", "color": "#FC5500" }],
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("field-create: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        fieldCreate.execute({
          "projectId": "ev:1",
          "name": "Priority",
          "type": "select",
          "options": '[{"name":"High","color":"#FC5500"}]',
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("field-create: declares perform and idempotent=false", () => {
  assertEquals(fieldCreate.type, "perform");
  assertEquals(fieldCreate.idempotent, false);
});
