import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/envelope-field-remove.ts";

const conn = { display: {} };

Deno.test("envelope-field-remove: POSTs the field id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  const result = await action.execute!({ fieldId: 7 }, ctx);
  assertEquals(calls[0].url, "https://app.documenso.com/api/v2/envelope/field/delete");
  assertEquals(JSON.parse(calls[0].body!), { fieldId: 7 });
  assertEquals(result, { fieldId: 7, removed: true });
});

Deno.test("envelope-field-remove: a missing id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`fieldId`");
  assertEquals(calls.length, 0);
});
