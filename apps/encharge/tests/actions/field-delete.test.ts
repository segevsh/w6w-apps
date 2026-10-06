import { assert, assertEquals, assertRejects } from "@std/assert";
import fieldDelete from "../../actions/field-delete.ts";
import { errBody, mockCtx, pathOf } from "../_helpers.ts";

const run = (ctx: Parameters<typeof fieldDelete.execute>[1], input: Record<string, unknown>) =>
  fieldDelete.execute(input as never, ctx) as Promise<unknown>;

Deno.test("field-delete: declares an idempotent perform action", () => {
  assertEquals(fieldDelete.key, "field-delete");
  assertEquals(fieldDelete.type, "perform");
  assertEquals(fieldDelete.idempotent, true);
  assert((fieldDelete.description ?? "").length > 0);
  assert(Array.isArray(fieldDelete.output) && fieldDelete.output.length > 0);
});

Deno.test("field-delete: DELETEs /fields/{name} with the name percent-encoded", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await run(ctx, { fieldName: "my plan/x" }), { ok: true });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/fields/my%20plan%2Fx");
  assertEquals(calls[0].body, null);
});

Deno.test("field-delete: requires a name; failures are thrown", async () => {
  const none = mockCtx([]);
  await assertRejects(() => run(none.ctx, { fieldName: " " }), Error, "fieldName");
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{ status: 404, body: errBody("No such field") }]);
  await assertRejects(() => run(ctx, { fieldName: "x" }), Error, "No such field");
});
