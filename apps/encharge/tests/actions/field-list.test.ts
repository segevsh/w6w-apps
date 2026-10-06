import { assert, assertEquals, assertRejects } from "@std/assert";
import fieldList from "../../actions/field-list.ts";
import { errBody, mockCtx } from "../_helpers.ts";

const run = (ctx: Parameters<typeof fieldList.execute>[1]) =>
  fieldList.execute({} as never, ctx) as Promise<unknown>;

Deno.test("field-list: declares a read action", () => {
  assertEquals(fieldList.key, "field-list");
  assertEquals(fieldList.type, "read");
  assert((fieldList.description ?? "").length > 0);
  assert(Array.isArray(fieldList.output) && fieldList.output.length > 0);
});

Deno.test("field-list: GETs /fields and returns the items", async () => {
  const body = { items: [{ name: "email", type: "string", readOnly: false, array: false }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await run(ctx), body);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.encharge.io/v1/fields");
});

Deno.test("field-list: an Encharge failure is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("nope") }]);
  await assertRejects(() => run(ctx), Error, "nope");
});
