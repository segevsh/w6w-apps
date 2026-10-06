import { assertEquals, assertRejects } from "@std/assert";
import fieldDelete from "../../actions/field-delete.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("field-delete: DELETE /fields/{fieldId} with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await fieldDelete.execute({ "fieldId": 4456411 }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/fields/4456411");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "ok": true });
});

Deno.test("field-delete: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () => Promise.resolve(fieldDelete.execute({ "fieldId": 4456411 }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("field-delete: declares perform and idempotent=true", () => {
  assertEquals(fieldDelete.type, "perform");
  assertEquals(fieldDelete.idempotent, true);
});
