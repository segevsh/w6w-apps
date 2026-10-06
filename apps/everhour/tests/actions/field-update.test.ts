import { assertEquals, assertRejects } from "@std/assert";
import fieldUpdate from "../../actions/field-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("field-update: PUT /fields/{fieldId} with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await fieldUpdate.execute({
    "fieldId": 4456411,
    "name": "Cost",
    "type": "number",
    "format": { "format": "currency", "label": "US$" },
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/fields/4456411");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "Cost",
    "type": "number",
    "format": { "format": "currency", "label": "US$" },
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("field-update: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        fieldUpdate.execute({
          "fieldId": 4456411,
          "name": "Cost",
          "type": "number",
          "format": { "format": "currency", "label": "US$" },
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("field-update: declares perform and idempotent=true", () => {
  assertEquals(fieldUpdate.type, "perform");
  assertEquals(fieldUpdate.idempotent, true);
});
