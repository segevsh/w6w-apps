import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import fieldValuesDelete from "../../actions/field-values-delete.ts";
import { mockCtx, pathOf, successBody } from "../_helpers.ts";

test("field-values-delete: DELETEs /field-values/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: successBody() }]);
  const out = await fieldValuesDelete.execute({ fieldValueId: 20406836 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/field-values/20406836");
  assertEquals(out, { success: true });
});
